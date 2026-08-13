// src/action/renewalActions/route.ts
"use server";

import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { addMonths } from "date-fns";
import { MembershipLevel } from "@prisma/client";

const validLevels: MembershipLevel[] = ["FREE", "SILVER", "GOLD", "PLATINUM"];

// ── 排序：FREE < SILVER < GOLD < PLATINUM ──
const levelRank: Record<MembershipLevel, number> = {
  FREE: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
};

// 用戶提交續訂/升級申請
export async function submitRenewalRequest(targetLevel: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授權：請先登入");
  }

  // 從 DB 撈使用者真實資料（不依賴 session）
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { membership: true },
  });

  if (!user) throw new Error("找不到使用者");

  if (!validLevels.includes(targetLevel as MembershipLevel)) {
    throw new Error("無效的會員等級");
  }

  const currentLevel = user.currentMembershipLevel;
  const targetRank = levelRank[targetLevel as MembershipLevel];
  const currentRank = levelRank[currentLevel];

  // 判斷申請類型
  let actionType: "UPGRADE" | "RENEWAL" | "DOWNGRADE" = "RENEWAL";

  if (targetRank > currentRank) {
    actionType = "UPGRADE";
  } else if (targetRank < currentRank) {
    actionType = "DOWNGRADE";
  }

  // 免費會員不能申請 FREE
  if (currentLevel === "FREE" && targetLevel === "FREE") {
    throw new Error("免費會員無法申請相同等級");
  }

  // 檢查會員是否已過期（續約限制）
  const membership = user.membership;
  const isExpired = membership?.endsAt
    ? new Date(membership.endsAt) < new Date()
    : true;

  if (actionType === "RENEWAL" && !isExpired) {
    throw new Error("您的會員資格尚未過期，暫不開放續訂");
  }

  // 建立申請
  await db.renewalRequest.create({
    data: {
      userId: user.id,
      tierLevel: targetLevel as MembershipLevel,
      status: "PENDING",
    },
  });

  const actionLabel =
    actionType === "UPGRADE"
      ? "升級"
      : actionType === "DOWNGRADE"
      ? "降級"
      : "續訂";

  return {
    success: true,
    message: `${actionLabel}申請已提交`,
  };
}

// 管理員批准續訂/升級
export async function approveRenewalRequest(requestId: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("未授權：僅限管理員");
  }

  return await db.$transaction(async (tx) => {
    const request = await tx.renewalRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) throw new Error("找不到此續訂請求");
    if (request.status !== "PENDING") throw new Error("此請求已處理過");

    // 取得目標等級的配置（包含到期期限）
    const targetTier = await tx.membershipTier.findUnique({
      where: { level: request.tierLevel },
    });

    if (!targetTier) throw new Error("找不到目標等級配置");

    const durationMonths = targetTier.durationMonths;

    // 1. 更新 User 等級
    await tx.user.update({
      where: { id: request.userId },
      data: { currentMembershipLevel: request.tierLevel },
    });

    // 2. 更新或建立 UserMembership
    const existing = await tx.userMembership.findUnique({
      where: { userId: request.userId },
    });

    if (existing) {
      let newEndsAt: Date;

      if (existing.tierLevel === request.tierLevel) {
        // 同級續約 → 從原到期日往後加
        const base = existing.endsAt && existing.endsAt > new Date()
          ? existing.endsAt
          : new Date();
        newEndsAt = addMonths(base, durationMonths);
      } else {
        // 升級/降級 → 從今天開始新的效期
        newEndsAt = addMonths(new Date(), durationMonths);
      }

      await tx.userMembership.update({
        where: { id: existing.id },
        data: {
          tierLevel: request.tierLevel,
          startsAt: new Date(),
          endsAt: newEndsAt,
          status: "active",
          autoRenew: true,
        },
      });
    } else {
      await tx.userMembership.create({
        data: {
          userId: request.userId,
          tierLevel: request.tierLevel,
          startsAt: new Date(),
          endsAt: addMonths(new Date(), durationMonths),
          status: "active",
          autoRenew: true,
        },
      });
    }

    // 3. 更新申請狀態
    await tx.renewalRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        processedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `已成功處理申請（效期 ${durationMonths} 個月）`,
    };
  });
}

// 管理員拒絕續訂/升級
export async function rejectRenewalRequest(requestId: string, notes?: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("未授權：僅限管理員");
  }

  const request = await db.renewalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new Error("找不到此續訂請求");
  if (request.status !== "PENDING") throw new Error("此請求已處理過");

  await db.renewalRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      processedAt: new Date(),
      notes: notes || "管理員拒絕申請",
    },
  });

  return { success: true, message: "已拒絕申請" };
}
