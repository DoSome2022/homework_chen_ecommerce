// src/action/Discount/route.ts
"use server";


import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "../../../auth";

// 刪除折扣的 Server Action
export async function deleteDiscountAction(discountId: string) {
  const session = await auth();

  // 權限檢查：只有 ADMIN 可以刪除
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "僅限管理員操作" };
  }

  try {
    // 1. 確認折扣是否存在
    const discount = await db.discount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      return { success: false, error: "折扣不存在" };
    }

    // 2. 執行刪除（Prisma 會自動處理關聯資料）
    await db.discount.delete({
      where: { id: discountId },
    });

    // 3. 重新驗證相關頁面快取
    revalidatePath("/admin/discounts");
    revalidatePath(`/admin/discounts/${discountId}`);

    return {
      success: true,
      message: `折扣「${discount.name}」已成功刪除`,
    };
  } catch (error) {
    console.error("[deleteDiscountAction] 刪除失敗:", error);
    return {
      success: false,
      error: "刪除失敗，請稍後再試",
    };
  }
}

export async function createDiscountAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "僅限管理員操作" };
  }

  try {
    const discount = await db.discount.create({
      data: {
        name: formData.get("name") as string,
        type: formData.get("type") as "MEMBER" | "PICKUP" | "TIMELIMIT",
        value: Number(formData.get("value")),
        isPercent: formData.get("isPercent") === "on",
        startAt: new Date(formData.get("startAt") as string),
        endAt: formData.get("endAt") ? new Date(formData.get("endAt") as string) : null,
        memberOnly: formData.get("memberOnly") === "on",
        pickupOnly: formData.get("pickupOnly") === "on",
        minAmount: formData.get("minAmount") ? Number(formData.get("minAmount")) : null,
        code: (formData.get("code") as string) || null,
      },
    });

    revalidatePath("/admin/discounts");

    return { success: true, message: "折扣新增成功", discount };
  } catch (error) {
    console.error("[createDiscountAction] 錯誤:", error);
    return { success: false, error: "新增失敗，請檢查輸入資料" };
  }
}

export async function updateDiscountAction(discountId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "僅限管理員操作" };
  }

  try {
    const discount = await db.discount.update({
      where: { id: discountId },
      data: {
        name: formData.get("name") as string,
        type: formData.get("type") as "MEMBER" | "PICKUP" | "TIMELIMIT",
        value: Number(formData.get("value")),
        isPercent: formData.get("isPercent") === "on",
        startAt: new Date(formData.get("startAt") as string),
        endAt: formData.get("endAt") ? new Date(formData.get("endAt") as string) : null,
        memberOnly: formData.get("memberOnly") === "on",
        pickupOnly: formData.get("pickupOnly") === "on",
        minAmount: formData.get("minAmount") ? Number(formData.get("minAmount")) : null,
        code: (formData.get("code") as string) || null,
      },
    });

    revalidatePath("/admin/discounts");
    revalidatePath(`/admin/discounts/${discountId}`);

    return { success: true, message: "折扣更新成功", discount };
  } catch (error) {
    console.error("[updateDiscountAction] 錯誤:", error);
    return { success: false, error: "更新失敗，請檢查輸入資料" };
  }
}