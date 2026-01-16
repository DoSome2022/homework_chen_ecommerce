// src/action/Order/route.ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { calculateDiscountedTotal } from '@/lib/discount';
import { auth } from '../../../auth';
import { Discount } from '@prisma/client';

const checkoutSchema = z.object({
  shippingName: z.string().min(1, '請填寫收件人姓名'),
  shippingPhone: z.string().min(8, '請填寫正確手機號碼'),
  shippingAddress: z.string().min(0, '請填寫完整地址'),
  shippingMethod: z.enum(['delivery', 'pickup']),
  preferredTime: z.string().optional(),
  shippingFee: z.coerce.number(),
  notes: z.string().optional(),
  transferProofImg: z.string().optional(),

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

  // 5. 計算總額
  let finalTotal: number;
  let appliedDiscounts: string[] = [];
  try {
    const calcResult = await calculateDiscountedTotal(
      cart.items,
      data.shippingMethod,
      selectedDiscountsInfo
    );
    finalTotal = calcResult.finalTotal;
    appliedDiscounts = calcResult.appliedDiscounts;
    console.log('[createOrder] 計算總額完成:', { finalTotal, appliedDiscounts });
  } catch (e) {
    console.error('[createOrder] 折扣計算失敗:', e);
    return { success: false, error: '計算折扣時發生錯誤' };
  }

  // 6. 建立訂單（事務）
  try {
    const order = await db.$transaction(async (tx) => {
      const discountNames = selectedDiscountsInfo.map((d) => d.name);
      const allAppliedDiscounts = [...discountNames, ...appliedDiscounts];

      const selectedDiscountIdsStr = selectedDiscountIds.join(',');
      const combinedNotes = [
        data.notes,
        `使用折扣ID: ${selectedDiscountIdsStr}`,
        allAppliedDiscounts.length > 0 ? `套用優惠：${allAppliedDiscounts.join('、')}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const createdOrder = await tx.order.create({
        data: {
          userId,
          total: finalTotal,
          status: 'pending_payment',
          shippingName: data.shippingName,
          shippingPhone: data.shippingPhone,
          shippingAddress: data.shippingAddress,
          shippingMethod: data.shippingMethod,
          paymentStatus: 'pending',
          paymentMethod: null,
          preferredDeliveryTime: data.preferredTime || null,
          shippingFee: data.shippingFee,
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

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return createdOrder;
    });

    revalidatePath('/cart');

    console.log('[createOrder] 訂單建立成功:', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: finalTotal,
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: finalTotal,
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
      where: { id: orderId, userId: session.user.id },
      include: {
        items: true,
        // 如果需要產品詳細資訊，你可能需要關聯產品表
        // items: {
        //   include: {
        //     product: true,
        //   },
        // },
      },
    });

    if (!order) {
      return { success: false, error: '訂單不存在' };
    }

    // 建立 Stripe Checkout Session
    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email || undefined,
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/${session.user.id}/checkout/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout?cancelled=true`,
      metadata: {
        orderId,
        userId: session.user.id,
      },
      line_items: order.items.map(item => ({
        price_data: {
          currency: 'twd',
          product_data: {
            name: item.title, // 使用 title 而不是 productName
            // description: item.size, // 使用 size 作為描述
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      shipping_options: order.shippingFee > 0 ? [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: Math.round(order.shippingFee * 100),
              currency: 'twd',
            },
            display_name: order.shippingMethod === 'delivery' ? '宅配運費' : '門市自取',
          },
        },
      ] : [],
    });

    // 儲存 stripeSessionId 到訂單（如果資料庫有此欄位）
    // 如果沒有 stripeSessionId 欄位，你可能需要更新 schema 或使用其他方式儲存
    await db.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'stripe', // 使用現有欄位記錄支付方式
        // 如果有 paymentInfo 或 notes 欄位，可以儲存 sessionId
        notes: order.notes ? `${order.notes}\nStripe Session ID: ${stripeSession.id}` : `Stripe Session ID: ${stripeSession.id}`,
      },
    });

    return {
      success: true,
      sessionId: stripeSession.id,
      url: stripeSession.url,
    };

  } catch (error) {
    console.error('建立 Stripe Checkout Session 失敗:', error);
    return { success: false, error: '支付系統錯誤' };
  }
}

export async function checkStripePaymentStatus(orderId: string, sessionId: string) {
  try {
    // 驗證訂單存在
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: '訂單不存在' };
    }

    // 從 Stripe 取得 session 資訊
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // 更新訂單狀態
      await db.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          // 使用現有欄位儲存 stripe 相關資訊
          paymentMethod: 'stripe',
          notes: order.notes ? `${order.notes}\nStripe Session ID: ${sessionId}` : `Stripe Session ID: ${sessionId}`,
        },
      });

      return {
        success: true,
        message: '付款成功！訂單已確認',
        orderDetails: {
          // 使用 total 而不是 finalTotal
          finalTotal: order.total,
          shippingMethod: order.shippingMethod,
          shippingFee: order.shippingFee,
        },
      };
    } else {
      return {
        success: false,
        error: '付款尚未完成',
      };
    }
  } catch (error) {
    console.error('驗證 Stripe 支付失敗:', error);
    return {
      success: false,
      error: '支付驗證失敗',
    };
  }
}