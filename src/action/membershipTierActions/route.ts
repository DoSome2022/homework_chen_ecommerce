// src/actions/membershipTierActions.ts
"use server";

import { db } from "@/lib/db";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "../../../auth";

const tierSchema = z.object({
  level: z.enum(["FREE", "SILVER", "GOLD", "PLATINUM"]),
  name: z.string().min(2, "名稱至少 2 個字"),
  price: z.number().int().min(0, "價格必須為非負整數"),
  benefits: z.array(z.string()).min(1, "至少填寫一項權益"),
  color: z.string().optional(),
});

export type TierFormData = z.infer<typeof tierSchema>;

// 建立新等級
export async function createMembershipTier(data: TierFormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "未授權" };
  }

  const validated = tierSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: "資料驗證失敗", errors: validated.error.flatten().fieldErrors };
  }

  try {
    const existing = await db.membershipTier.findUnique({
      where: { level: validated.data.level },
    });
    if (existing) {
      return { success: false, error: "此等級已存在" };
    }

    await db.membershipTier.create({
      data: {
        level: validated.data.level,
        name: validated.data.name,
        price: validated.data.price,
        benefits: validated.data.benefits,
        color: validated.data.color,
      },
    });

    revalidatePath("/admin/membership-tiers");
    return { success: true, message: "等級建立成功" };
  } catch (error) {
    console.error(error);
    return { success: false, error: "建立失敗" };
  }
}

// 更新等級
export async function updateMembershipTier(id: string, data: TierFormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "未授權" };
  }

  const validated = tierSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: "資料驗證失敗", errors: validated.error.flatten().fieldErrors };
  }

  try {
    const existing = await db.membershipTier.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "等級不存在" };
    }

    // 防止修改 level（因為它是 @unique）
    if (validated.data.level !== existing.level) {
      return { success: false, error: "不可修改等級代碼" };
    }

    await db.membershipTier.update({
      where: { id },
      data: {
        name: validated.data.name,
        price: validated.data.price,
        benefits: validated.data.benefits,
        color: validated.data.color,
      },
    });

    revalidatePath("/admin/membership-tiers");
    return { success: true, message: "等級更新成功" };
  } catch (error) {
    console.error(error);
    return { success: false, error: "更新失敗" };
  }
}

// 刪除等級（需檢查是否有使用者使用）
export async function deleteMembershipTier(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "未授權" };
  }

  try {
    const existing = await db.membershipTier.findUnique({
      where: { id },
      select: { level: true },
    });

    if (!existing) {
      return { success: false, error: "等級不存在" };
    }

    // 檢查是否有會員使用此等級
    const usageCount = await db.userMembership.count({
      where: {
        tierLevel: existing.level,
      },
    });

    if (usageCount > 0) {
      return { success: false, error: "無法刪除：已有會員使用此等級" };
    }

    await db.membershipTier.delete({ where: { id } });

    revalidatePath("/admin/membership-tiers");
    return { success: true, message: "等級已刪除" };
  } catch (error) {
    console.error(error);
    return { success: false, error: "刪除失敗" };
  }
}