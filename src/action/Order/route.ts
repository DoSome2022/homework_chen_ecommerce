// src/action/Order/route.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import { calculateDiscountedTotal } from '@/lib/discount';
import { auth } from '../../../auth';
import { Discount } from '@prisma/client';

const checkoutSchema = z.object({
  shippingName: z.string().min(1, '請填寫收件人姓名'),
  shippingPhone: z.string().min(8, '請填寫正確手機號碼'),
  shippingAddress: z.string().min(5, '請填寫完整地址'),
  shippingMethod: z.enum(['delivery', 'pickup']),
  preferredTime: z.string().optional(),
  shippingFee: z.coerce.number(),
  notes: z.string().optional(),
  transferProofImg: z.string().optional(),
});

export async function createOrder(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('請先登入');

  const userId = session.user.id;

  // 處理用戶選擇的折扣
  const selectedDiscountsStr = formData.get('selectedDiscounts') as string;
  const selectedDiscountIds = selectedDiscountsStr ? 
    JSON.parse(selectedDiscountsStr) : [];

  // 處理文字欄位驗證
  const rawText = {
    shippingName: formData.get('shippingName'),
    shippingPhone: formData.get('shippingPhone'),
    shippingAddress: formData.get('shippingAddress'),
    shippingMethod: formData.get('shippingMethod'),
    preferredTime: formData.get('preferredTime'),
    shippingFee: formData.get('shippingFee'),
    notes: formData.get('notes'),
    transferProofImg: formData.get('transferProofImg'),
  };

  const validated = checkoutSchema.safeParse(rawText);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  // 獲取購物車完整資料（包含商品價格）
  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return { success: false, error: '購物車為空' };
  }

  // 獲取用戶選擇的折扣詳細資訊
  let selectedDiscountsInfo: Discount[] = [];
  if (selectedDiscountIds.length > 0) {
    selectedDiscountsInfo = await db.discount.findMany({
      where: {
        id: { in: selectedDiscountIds }
      }
    });
  }

  // 計算折扣後金額（傳入用戶選擇的折扣）
  const {
    finalTotal,
    appliedDiscounts,
  } = await calculateDiscountedTotal(
    cart.items,
    validated.data.shippingMethod,
    selectedDiscountsInfo // 傳入用戶選擇的折扣
  );

  // 建立訂單（使用事務）
  const order = await db.$transaction(async (tx) => {
    // 合併使用者備註、選擇的折扣與系統自動應用的折扣
    const discountNames = selectedDiscountsInfo.map(d => d.name);
    const allAppliedDiscounts = [...discountNames, ...appliedDiscounts];
    
    // === 這裡使用替代方案 ===
    const selectedDiscountIdsStr = selectedDiscountIds.join(',');
    const combinedNotes = [
      validated.data.notes,
      `使用折扣ID: ${selectedDiscountIdsStr}`, // 記錄折扣ID
      allAppliedDiscounts.length > 0 ? `套用優惠：${allAppliedDiscounts.join('、')}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    // ======================


    // 創建訂單
    const createdOrder = await tx.order.create({
      data: {
        userId,
        total: finalTotal,
        status: 'pending',
        shippingName: validated.data.shippingName,
        shippingPhone: validated.data.shippingPhone,
        shippingAddress: validated.data.shippingAddress,
        shippingMethod: validated.data.shippingMethod,
        preferredDeliveryTime: validated.data.preferredTime || null,
        shippingFee: validated.data.shippingFee,
        notes: combinedNotes, // 這裡使用包含折扣ID的備註
        transferProofImg: validated.data.transferProofImg || null,
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

    // 如果有選擇折扣，記錄折扣使用情況
    // if (selectedDiscountIds.length > 0) {
    //   for (const discountId of selectedDiscountIds) {
    //     await tx.discountUse.create({
    //       data: {
    //         discountId,
    //         orderId: createdOrder.id,
    //         userId,
    //         appliedAt: new Date(),
    //       },
    //     });
    //   }
    // }
    

    // 清空購物車
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return createdOrder;
  });

  revalidatePath('/cart');
  redirect(`/user/${userId}/checkout/success?order=${order.orderNumber}`);
}
export type OrderActionResult =
  | { success: true }
  | { success: false; error: string; errors?: Record<string, string[]> };

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


