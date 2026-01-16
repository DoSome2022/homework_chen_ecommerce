// app/lib/actions/cart.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "../../../auth";

// 回傳型別（聯合型別，TypeScript 完全認得）
export type CartActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

// 取得購物車（保持不變，超棒！）
export async function getCart() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { product: { select: { id: true, title: true, img: true, price: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

// 關鍵升級：支援一次加入多個單位！
export async function addToCartAction(
  productId: string,
  units: string[],          // ← 改成陣列！
  quantityPerUnit: number = 1
): Promise<CartActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "請先登入" };
  }

  const userId = session.user.id;

  // 驗證商品存在
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return { success: false, error: "商品不存在" };
  }

  // 確保購物車存在
  const cart = await db.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  try {
    // 為每個選中的單位 upsert 一筆
    for (const unit of units) {
      if (!unit.trim()) continue; // 防呆

      const res = await db.cartItem.upsert({
        where: {
          cartId_productId_unit: {
            cartId: cart.id,
            productId,
            unit,
          },
        },
        update: {
          quantity: { increment: quantityPerUnit },
        },
        create: {
          cartId: cart.id,
          productId,
          unit,
          quantity: quantityPerUnit,
        },
      });

    console.log(" server_side_data : ", res , "-- End --")   
    }

    revalidatePath(`/user/${userId}/cart`);
    revalidatePath(`/user/${userId}/shop/${productId}`); // 可選：即時更新詳情頁

   
    return { success: true, message: "已加入購物車" };
  } catch (error) {
    console.error("加入購物車失敗:", error);
    return { success: false, error: "加入失敗，請稍後再試" };
  }
}

// 數量調整（不變）
export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
    const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "請先登入" };
  }

  const userId = session.user.id;

  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: cartItemId } });
  } else {
    await db.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });
  }
  revalidatePath(`/user/${userId}/cart`);
}

// 刪除項目（不變）
export async function removeCartItem(cartItemId: string) {
    const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "請先登入" };
  }

  const userId = session.user.id;

  await db.cartItem.delete({ where: { id: cartItemId } });
  revalidatePath(`/user/${userId}/cart`);
}