// src/action/Order/route.ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { calculateDiscountedTotal } from '@/lib/discount';
import { auth } from '../../../auth';
import { Discount } from '@prisma/client';
import { ReturnStatus } from "@prisma/client";  // ← 加入這行

const checkoutSchema = z.object({
  shippingName: z.string().min(1, '請填寫收件人姓名'),
  shippingPhone: z.string().min(8, '請填寫正確手機號碼'),
  shippingAddress: z.string().min(0, '請填寫完整地址'),
  shippingMethod: z.enum(['delivery', 'pickup']),
  preferredTime: z.string().optional(),
  shippingFee: z.coerce.number(),
  notes: z.string().optional(),
  transferProofImg: z.string().optional(),
  finalTotal: z.string().optional(), // ✅ 添加這個欄位
preferredDeliveryTime: z.enum(['全日', '上午', '下午']).optional(),
});



export async function createOrder(formData: FormData) {
  console.log('[createOrder] 開始執行');

  const session = await auth();
  if (!session?.user?.id) {
    console.error('[createOrder] 未登入或 session 無 user.id');
    return { success: false, error: '請先登入' };
  }

  const userId = session.user.id;
  console.log('[createOrder] 使用者 ID:', userId);

  // 1. 取得並記錄所有表單資料
  const rawData = Object.fromEntries(formData);
  console.log('[createOrder] 收到的 FormData:', rawData);

  // 處理折扣
  const selectedDiscountsStr = formData.get('selectedDiscounts') as string;
  let selectedDiscountIds: string[] = [];
  if (selectedDiscountsStr) {
    try {
      selectedDiscountIds = JSON.parse(selectedDiscountsStr);
      console.log('[createOrder] 選擇的折扣 ID:', selectedDiscountIds);
    } catch (e) {
      console.error('[createOrder] 解析 selectedDiscounts 失敗:', e);
      return { success: false, error: '折扣選擇格式錯誤' };
    }
  }

  // ✅ 取得前端計算的折扣後總額
  const finalPayableAmountStr = formData.get('finalTotal') as string;
  let finalPayableAmount: number | null = null;
  
  if (finalPayableAmountStr) {
    finalPayableAmount = parseInt(finalPayableAmountStr, 10);
    console.log('[createOrder] 前端傳入的折扣後金額:', finalPayableAmount);
  }

  // 2. 驗證表單資料
  const validated = checkoutSchema.safeParse(rawData);
  if (!validated.success) {
    console.error('[createOrder] 表單驗證失敗:', validated.error.format());
    return {
      success: false,
      error: '表單資料不完整或格式錯誤',
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const data = validated.data;
  console.log('[createOrder] 驗證通過，資料:', data);

  // 3. 查詢購物車
  let cart;
  try {
    cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  } catch (e) {
    console.error('[createOrder] 查詢購物車失敗:', e);
    return { success: false, error: '無法取得購物車資料' };
  }

  if (!cart || cart.items.length === 0) {
    console.warn('[createOrder] 購物車為空或不存在', { userId });
    return { success: false, error: '購物車為空，請先加入商品' };
  }

  console.log('[createOrder] 購物車找到，商品數:', cart.items.length);

  // 4. 查詢選擇的折扣
  let selectedDiscountsInfo: Discount[] = [];
  if (selectedDiscountIds.length > 0) {
    try {
      selectedDiscountsInfo = await db.discount.findMany({
        where: { id: { in: selectedDiscountIds } },
      });
      console.log('[createOrder] 找到折扣數:', selectedDiscountsInfo.length);
    } catch (e) {
      console.error('[createOrder] 查詢折扣失敗:', e);
      return { success: false, error: '無法取得折扣資訊' };
    }
  }

  // 5. 計算總額（用於驗證和記錄）
  let calculatedTotal: number;
  let appliedDiscounts: string[] = [];
  let shippingFee: number;
  
  try {
    const calcResult = await calculateDiscountedTotal(
      cart.items,
      data.shippingMethod,
      selectedDiscountsInfo
    );
    calculatedTotal = calcResult.finalTotal;
    appliedDiscounts = calcResult.appliedDiscounts;
    shippingFee = calcResult.shippingFee;
    console.log('[createOrder] 計算總額完成:', { 
      calculatedTotal, 
      appliedDiscounts, 
      shippingFee 
    });
  } catch (e) {
    console.error('[createOrder] 折扣計算失敗:', e);
    return { success: false, error: '計算折扣時發生錯誤' };
  }

  // ✅ 驗證前端傳入的金額與後端計算是否一致（允許小誤差）
  if (finalPayableAmount !== null) {
    const difference = Math.abs(finalPayableAmount - calculatedTotal);
    if (difference > 1) { // 允許 1 元以內的誤差
      console.warn('[createOrder] 金額不一致:', {
        前端傳入: finalPayableAmount,
        後端計算: calculatedTotal,
        差異: difference
      });
      // 可以選擇記錄或警告，但繼續使用前端金額
    }
  }

  // ✅ 決定要使用的總額（優先使用前端傳入的折扣後金額）
  const orderTotal = finalPayableAmount !== null ? finalPayableAmount : calculatedTotal;
  console.log('[createOrder] 最終訂單總額:', orderTotal);

  // 6. 建立訂單（事務）
  try {
    const order = await db.$transaction(async (tx) => {
      const combinedNotes = [
        data.notes,
        `使用折扣ID: ${selectedDiscountIds.join(',')}`,
        appliedDiscounts.length > 0 ? `套用優惠：${appliedDiscounts.join('、')}` : null,
        `運費：${data.shippingFee}`,
        finalPayableAmount !== null ? `前端折扣後金額：$${finalPayableAmount}` : null,
        `後端計算金額：$${calculatedTotal}`,
      ].filter(Boolean).join('\n');

      // ✅ 建立訂單，使用折扣後的金額
      const createdOrder = await tx.order.create({
        data: {
          userId,
          total: orderTotal, // ✅ 使用折扣後的金額
          status: 'pending_payment',
          shippingName: data.shippingName,
          shippingPhone: data.shippingPhone,
          shippingAddress: data.shippingAddress,
          shippingMethod: data.shippingMethod,
          paymentStatus: 'pending',
          paymentMethod: null,
          preferredDeliveryTime: data.preferredDeliveryTime || null,
          shippingFee: shippingFee, // ✅ 使用計算的運費
          notes: combinedNotes,
          transferProofImg: data.transferProofImg || null,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              title: item.product.title || '未知商品',
              image: item.product.img || null,
              size: item.unit,
              price: item.product.price ? parseInt(item.product.price, 10) : 0,
              quantity: item.quantity,
            })),
          },
        },
      });

      // 清空購物車
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return createdOrder;
    });

    revalidatePath('/cart');

    console.log('[createOrder] 訂單建立成功:', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total, // 折扣後的金額
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total, // ✅ 返回折扣後的金額
    };
  } catch (e) {
    console.error('[createOrder] 事務執行失敗:', e);
    return { success: false, error: '建立訂單失敗，請稍後再試' };
  }
}

// 其餘動作函式（updateTrackingNumberAction、settleOrderToAccountAction 等）保持不變
// ...（請保留您檔案中其餘的 export async function）

  // src/action/Order/route.ts （在你的 createOrder 同一個檔案）
export async function updateTrackingNumberAction(
  orderId: string,
  trackingNumber: string
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "未授權" };
  }

  try {
    await db.order.update({
      where: { id: orderId },
      data: { trackingNumber },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");

    return { success: true, message: "物流單號已更新" };
  } catch (error) {
    console.error("更新物流單號失敗:", error);
    return { success: false, error: "更新失敗" };
  }
}


// src/action/Order/route.ts（在您原本檔案最下面加入）

export async function settleOrderToAccountAction(orderId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "未授權" };
  }

  try {
    // 檢查是否已經結算過
    const existing = await db.accountEntry.findUnique({
      where: { orderId },
  });
    if (existing) {
      return { success: false, error: "此訂單已結算過" };
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return { success: false, error: "訂單不存在" };
    }

    await db.accountEntry.create({
      data: {
        orderId,
        settledById: session.user.id as string,
        totalAmount: order.total,
        shippingFee: order.shippingFee,
        productAmount: order.total - order.shippingFee,
      },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/accountant");

    return { success: true, message: "已成功入帳" };
  } catch (error) {
    console.error("結算入帳失敗:", error);
    return { success: false, error: "結算失敗，請稍後再試" };
  }
}

// 切換單一商品備貨狀態
export async function toggleItemPickedAction(orderItemId: string, isPicked: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "未授權" };
  }

  try {
    await db.orderItem.update({
      where: { id: orderItemId },
      data: { isPicked },
    });

    return { success: true };
  } catch (error) {
    console.error("更新備貨狀態失敗:", error);
    return { success: false, error: "更新失敗" };
  }
}

// 標記整筆訂單備貨完成（可選：新增 order.pickedAt 時間）
export async function completePickingAction(orderId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "未授權" };
  }

  try {
    // 可選：在 Order 模型加 pickedAt: DateTime?
    // await db.order.update({ where: { id: orderId }, data: { pickedAt: new Date() } });

    // 或僅依賴所有 OrderItem.isPicked === true 判斷（本方案採用此方式，無需改 Order 模型）

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");

    return { success: true, message: "備貨完成" };
  } catch (error) {
    console.error("備貨完成失敗:", error);
    return { success: false, error: "操作失敗" };
  }
}


// 建立 Payment Intent（在結帳頁面呼叫）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});


export async function createStripeCheckoutSession(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: '未登入' };
    }

    // 從資料庫取得訂單資訊
    const order = await db.order.findUnique({
      where: { 
        id: orderId, 
        userId: session.user.id,
        paymentStatus: 'pending',
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return { success: false, error: '訂單不存在或已付款' };
    }

    console.log('[createStripeCheckoutSession] 訂單資訊:', {
      訂單總額: order.total,          // 這應該已經是 245（包含運費）
      運費: order.shippingFee,        // 100
      商品數量: order.items.length,
    });

    // ✅ 簡單！直接使用 order.total（已包含運費）
    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email || undefined,
      payment_method_types: ['card'],
      mode: 'payment',
      
      // 成功和取消URL
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/${session.user.id}/checkout/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/${session.user.id}/checkout?orderId=${orderId}&cancelled=true`,
      
      // 訂單元數據
      metadata: {
        orderId,
        userId: session.user.id,
        orderNumber: order.orderNumber,
      },
      
      // ✅ 關鍵：只放一個項目，金額就是 order.total
      line_items: [
        {
          price_data: {
            currency: 'hkd',
            product_data: {
              name: `訂單 ${order.orderNumber}`,
              description: `${order.items.length} 件商品（總金額包含運費）`,
            },
            unit_amount: Math.round(order.total * 100), // ✅ 直接使用 24500
          },
          quantity: 1,
        },
      ],
      
      // ✅ 可選：添加運費說明（不影響金額）
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0, // 金額為0，只顯示資訊
              currency: 'hkd',
            },
            display_name: order.shippingMethod === 'delivery' 
              ? `宅配運費 $${order.shippingFee}（已包含）`
              : '門市自取',
          },
        },
      ],
    });

    // 更新訂單
    await db.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'stripe',
        paymentIntentId: stripeSession.id,
        paymentStatus: 'processing',
        notes: order.notes 
          ? `${order.notes}\nStripe支付: ${stripeSession.id}`
          : `Stripe支付: ${stripeSession.id}`,
      },
    });

    return {
      success: true,
      sessionId: stripeSession.id,
      url: stripeSession.url,
      amount: order.total, // 返回總金額
    };

  } catch (error) {
    console.error('[createStripeCheckoutSession] 建立失敗:', error);
    return { 
      success: false, 
      error: '支付系統錯誤' 
    };
  }
}



export async function checkStripePaymentStatus(orderId: string, sessionId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: '訂單不存在' };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    console.log('[checkStripePaymentStatus] Stripe Session 詳情:', {
      id: session.id,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      預期商品金額: order.total - order.shippingFee,
    });

    if (session.payment_status === 'paid') {
      const productAmount = order.total - order.shippingFee;
      const expectedAmount = Math.round(productAmount * 100);
      const actualAmount = session.amount_total || 0;
      
      if (actualAmount !== expectedAmount) {
        console.warn('[checkStripePaymentStatus] 商品金額不一致:', {
          預期商品金額: expectedAmount,
          實際收取: actualAmount,
          訂單總額: order.total,
          運費: order.shippingFee,
        });
      }

      // 移除原本的 db.order.update（移到 createOrderFromTemp 統一處理）

      console.log('[checkStripePaymentStatus] 分開支付成功:', {
        orderId,
        商品金額: productAmount,
        運費: order.shippingFee,
        總金額: order.total,
      });

      return {
        success: true,
        message: '商品金額支付成功！訂單已確認',
        orderDetails: {
          orderNumber: order.orderNumber,
          商品金額: productAmount,
          運費: order.shippingFee,
          總金額: order.total,
          支付狀態: '商品金額已支付，運費已在前端支付',
          paidAt: new Date(),
        },
      };
    } else {
      return {
        success: false,
        error: `付款狀態: ${session.payment_status}`,
        paymentStatus: session.payment_status,
      };
    }
  } catch (error) {
    console.error('[checkStripePaymentStatus] 驗證失敗:', error);
    return {
      success: false,
      error: '支付驗證失敗',
    };
  }
}

export async function createTempOrder(formData: FormData) {
  console.log('[createTempOrder] 開始執行暫存訂單');

  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.error('[createTempOrder] 未登入或 session 無 user.id');
      return { success: false, error: '請先登入' };
    }

    const userId = session.user.id;
    
    // 解析表單資料
    const rawData = Object.fromEntries(formData);
    
    // 處理折扣信息
    const discountIdsJson = rawData.selectedDiscounts as string | undefined;
    const discountIds: string[] = [];
    
    if (discountIdsJson) {
      try {
        const parsed = JSON.parse(discountIdsJson);
        if (Array.isArray(parsed)) {
          discountIds.push(...parsed);
        }
      } catch (e) {
        console.warn('[createTempOrder] 折扣ID解析失敗:', e);
      }
    }

    // 準備數據
    const finalTotal = parseInt(rawData.finalTotal as string, 10) || 0;
    const shippingFee = parseInt(rawData.shippingFee as string, 10) || 0;
    
    // 創建備註
    const notesParts: string[] = [];
    
    if (rawData.notes) {
      notesParts.push(rawData.notes as string);
    }
    
    if (discountIds.length > 0) {
      notesParts.push(`折扣ID: ${discountIds.join(', ')}`);
    }
    
    notesParts.push(`暫存訂單 - ${new Date().toLocaleString()}`);
    notesParts.push('待支付完成後轉為正式訂單');
    
    const notes = notesParts.join('\n---\n');

    // 創建暫存訂單
    const tempOrder = await db.order.create({
      data: {
        userId,
        total: finalTotal,
        status: 'pending_payment',
        shippingName: rawData.shippingName as string,
        shippingPhone: rawData.shippingPhone as string,
        shippingAddress: rawData.shippingAddress as string,
        shippingMethod: rawData.shippingMethod as 'delivery' | 'pickup',
        paymentStatus: 'pending',
        paymentMethod: null,
        preferredDeliveryTime: rawData.preferredDeliveryTime as string || null,
        shippingFee: shippingFee,
        notes: notes,
        transferProofImg: null,
      },
    });

    console.log('[createTempOrder] 暫存訂單建立成功:', {
      orderId: tempOrder.id,
      orderNumber: tempOrder.orderNumber,
    });

    return {
      success: true,
      orderId: tempOrder.id,
      orderNumber: tempOrder.orderNumber,
      total: tempOrder.total,
      userId: userId,
    };

  } catch (error) {
    console.error('[createTempOrder] 建立失敗:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '暫存訂單建立失敗'
    };
  }
}

// 修改原有的 createOrder，用於在成功頁面創建正式訂單
// src/action/Order/route.ts

export async function createOrderFromTemp(orderId: string) {
  console.log('[createOrderFromTemp] 開始轉換為正式訂單並清空購物車', { orderId });

  const session = await auth();
  if (!session?.user?.id) {
    console.error('[createOrderFromTemp] 未登入');
    return { success: false, error: '請先登入' };
  }

  const userId = session.user.id;
  console.log('[createOrderFromTemp] 查詢使用者 ID:', userId);

  try {
    const result = await db.$transaction(async (tx) => {
      console.log('[createOrderFromTemp] 開始事務');

      // 1. 查詢暫存訂單（移除 status 條件）
      const tempOrder = await tx.order.findUnique({
        where: { 
          id: orderId, 
          userId,
        },
      });

      console.log('[createOrderFromTemp] 查詢暫存訂單結果:', tempOrder ? {
        found: true,
        id: tempOrder.id,
        status: tempOrder.status,
        userId: tempOrder.userId,
        total: tempOrder.total,
      } : { found: false });

      if (!tempOrder) {
        throw new Error('訂單不存在或不屬於您');
      }

      // 容錯：如果已處理，直接返回
      if (tempOrder.status === 'paid') {
        console.log('[createOrderFromTemp] 訂單已轉換過，跳過重複處理', { status: tempOrder.status });
        return tempOrder;
      }

      // 2. 查詢購物車
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      console.log('[createOrderFromTemp] 購物車查詢結果:', {
        cartFound: !!cart,
        cartId: cart?.id,
        itemCount: cart?.items.length ?? 0,
      });

      // 3. 批量建立 OrderItem
      if (cart && cart.items.length > 0) {
        await tx.orderItem.createMany({
          data: cart.items.map((item) => ({
            orderId: tempOrder.id,
            productId: item.productId,
            title: item.product.title || '未知商品',
            image: item.product.img || null,
            size: item.unit,
            price: item.product.price ? parseInt(item.product.price, 10) : 0,
            quantity: item.quantity,
          })),
          skipDuplicates: true,
        });

        console.log('[createOrderFromTemp] 已建立 OrderItem 數量:', cart.items.length);
      }

      // 4. 清空購物車
      const deleteResult = await tx.cartItem.deleteMany({
        where: { cartId: cart?.id },
      });

      console.log('[createOrderFromTemp] 清空購物車結果:', {
        deletedCount: deleteResult.count,
      });

      // 5. 更新訂單狀態（統一在此處理）
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'paid',
          paymentStatus: 'succeeded',
          paidAt: new Date(),
          notes: `正式訂單 - ${new Date().toISOString()}\n${tempOrder.notes || ''}`,
        },
      });

      console.log('[createOrderFromTemp] 訂單狀態更新成功', { newStatus: updatedOrder.status });

      return updatedOrder;
    });

    revalidatePath('/cart');
    revalidatePath(`/user/${userId}/order`);
    revalidatePath(`/user/${userId}/order/${result.orderNumber}`);

    return {
      success: true,
      orderId: result.id,
      orderNumber: result.orderNumber,
      total: result.total,
    };
  } catch (e) {
    console.error('[createOrderFromTemp] 失敗:', e);
    return { 
      success: false, 
      error: e instanceof Error ? e.message : '訂單轉換失敗' 
    };
  }
}
// src/action/Order/route.ts

export async function submitReturnRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: '請先登入' };
  }

  const userId = session.user.id;
  const orderId = formData.get('orderId') as string;
  const reason = formData.get('reason') as string;
  const description = formData.get('description') as string | null;
  // const images = formData.getAll('images') as File[]; // 如果支援上傳圖片

  if (!orderId || !reason) {
    return { success: false, error: '缺少必要欄位' };
  }

  try {
    // 1. 驗證訂單存在且屬於該用戶
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      return { success: false, error: '訂單不存在或無權限' };
    }

    // 2. 檢查是否已存在退貨申請
    const existing = await db.returnRequest.findUnique({
      where: { orderId },
    });

    if (existing) {
      return { success: false, error: '該訂單已有退貨申請' };
    }

    // 3. （可選）上傳圖片到 OSS 或 Cloudinary，並取得 URL
    const imageUrls: string[] = [];
    // 如果有圖片上傳邏輯，請在此處理
    // 例如：const urls = await uploadImagesToOSS(images);

    // 4. 建立退貨申請
    const returnRequest = await db.returnRequest.create({
      data: {
        orderId,
        userId,
        reason,
        description,
        images: imageUrls,
        status: 'PENDING',
        requestedAt: new Date(),
      },
    });

    // 5. 更新訂單狀態（可選：設為 "return_requested"）
    await db.order.update({
      where: { id: orderId },
      data: {
        status: 'return_requested', // 可新增這個狀態到 enum
        notes: `${order.notes || ''}\n---\n退貨申請提交於 ${new Date().toISOString()}`,
      },
    });

    revalidatePath(`/user/${userId}/order/${order.orderNumber}`);
    revalidatePath(`/admin/orders/${orderId}`);

    return {
      success: true,
      message: '退貨申請已提交，我們將盡快審核',
      returnId: returnRequest.id,
    };
  } catch (error) {
    console.error('[submitReturnRequest] 錯誤:', error);
    return { success: false, error: '提交退貨申請失敗，請稍後再試' };
  }
}


export async function processReturnRequest(
  returnId: string,
  action: "approve" | "reject" | "refund",
  adminNotes?: string
) {
  "use server";

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "僅限管理員操作" };
  }

  try {
    const returnReq = await db.returnRequest.findUnique({
      where: { id: returnId },
      include: { order: true },
    });

    if (!returnReq) {
      return { success: false, error: "退貨申請不存在" };
    }

    if (returnReq.status !== "PENDING") {
      return { success: false, error: "此申請已處理過" };
    }

    let newStatus: ReturnStatus;
    let orderStatus = returnReq.order.status;

    switch (action) {
      case "approve":
        newStatus = "APPROVED";
        orderStatus = "return_approved";
        break;
      case "reject":
        newStatus = "REJECTED";
        orderStatus = "return_rejected";
        break;
      case "refund":
        newStatus = "REFUNDED";
        orderStatus = "return_refunded";
        // 未來可在此整合 Stripe refund
        break;
      default:
        return { success: false, error: "無效操作" };
    }

    await db.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status: newStatus,
          processedAt: new Date(),
          processedBy: session.user.id,
          notes: adminNotes ? `${returnReq.notes || ""}\n管理員備註：${adminNotes}`.trim() : returnReq.notes,
        },
      });

      await tx.order.update({
        where: { id: returnReq.orderId },
        data: { status: orderStatus },
      });
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/order/${returnReq.orderId}`);

    const actionText = action === "approve" ? "批准" : action === "reject" ? "拒絕" : "完成退款";
    return { success: true, message: `退貨申請已${actionText}` };
  } catch (error) {
    console.error("[processReturnRequest] 錯誤:", error);
    return { success: false, error: "處理失敗，請稍後再試" };
  }
}

// src/action/Order/route.ts

// 1. 修改訂單（可編輯狀態、物流單號、備註等）
// src/action/Order/route.ts

// 修正 updateOrderAction 函數中的 any 類型
export async function updateOrderAction(
  orderId: string,
  data: {
    status?: string;
    trackingNumber?: string | null;
    notes?: string | null;
    // 可依需求擴充其他可編輯欄位
  }
) {
  "use server";

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "僅限管理員操作" };
  }

  try {
    // 定義明確的更新資料類型
    type UpdateData = {
      status?: string;
      trackingNumber?: string | null;
      notes?: string | null;
      shippingAddress?: string;
      preferredDeliveryTime?: string | null;
      // 其他可更新字段
    };

    const updateData: UpdateData = {};
    
    // 僅添加有提供的欄位
    if (data.status !== undefined) updateData.status = data.status;
    if (data.trackingNumber !== undefined) updateData.trackingNumber = data.trackingNumber;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // 添加其他可更新字段的檢查（如果需要的話）
    // if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;
    // if (data.preferredDeliveryTime !== undefined) updateData.preferredDeliveryTime = data.preferredDeliveryTime;

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "無任何欄位需要更新" };
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: updateData,
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/order/${orderId}`);

    return {
      success: true,
      message: "訂單已更新",
      order: updatedOrder,
    };
  } catch (error) {
    console.error("[updateOrderAction] 錯誤:", error);
    return { success: false, error: "更新失敗，請稍後再試" };
  }
}

// 2. 刪除訂單（硬刪除，含確認）
export async function deleteOrderAction(orderId: string) {
  "use server";

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "僅限管理員操作" };
  }

  try {
    // 可選：先檢查訂單是否存在
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: "訂單不存在" };
    }

    // 執行刪除（會級聯刪除 OrderItem 等關聯資料）
    await db.order.delete({
      where: { id: orderId },
    });

    revalidatePath("/admin/orders");

    return {
      success: true,
      message: `訂單 ${order.orderNumber} 已刪除`,
    };
  } catch (error) {
    console.error("[deleteOrderAction] 錯誤:", error);
    return { success: false, error: "刪除失敗，可能有關聯資料" };
  }
}