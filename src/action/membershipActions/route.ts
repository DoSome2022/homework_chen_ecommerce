// src/action/membershipActions/route.ts
"use server";

import { db } from "@/lib/db";

import { addMonths, isBefore } from "date-fns";
import { auth } from "../../../auth";

// ─────────────────────────────────────────────
// 自動升級：檢查用戶消費是否達到更高等級門檻
// 在訂單完成時呼叫
// ─────────────────────────────────────────────
export async function checkAndApplyAutoUpgrade(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { membership: true },
  });

  if (!user) return null;

  // 找出所有允許自動升級且門檻已達到的等級，取最高者
  const eligibleTiers = await db.membershipTier.findMany({
    where: {
      autoUpgrade: true,
      minSpendForUpgrade: { lte: user.totalSpent, not: null },
    },
    orderBy: { minSpendForUpgrade: "desc" },
  });

  if (eligibleTiers.length === 0) return null;

  const targetTier = eligibleTiers[0];

  // 已經是此等級或更高，不用升
  if (user.currentMembershipLevel === targetTier.level) return null;

  // 執行升級
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { currentMembershipLevel: targetTier.level },
    });

    const now = new Date();
    const newEndsAt = addMonths(now, targetTier.durationMonths);

    if (user.membership) {
      await tx.userMembership.update({
        where: { id: user.membership.id },
        data: {
          tierLevel: targetTier.level,
          startsAt: now,
          endsAt: newEndsAt,
          status: "active",
        },
      });
    } else {
      await tx.userMembership.create({
        data: {
          userId,
          tierLevel: targetTier.level,
          startsAt: now,
          endsAt: newEndsAt,
          status: "active",
          autoRenew: true,
        },
      });
    }
  });

  return { upgradedTo: targetTier.level };
}

// ─────────────────────────────────────────────
// 自動降級：檢查單一會員是否到期
// 到期後降為 FREE
// ─────────────────────────────────────────────
export async function checkAndDowngradeExpired(userId: string) {
  const membership = await db.userMembership.findUnique({
    where: { userId },
  });

  if (!membership) return null;

  // 到期日不存在或還沒到期 → 不動作
  if (!membership.endsAt || !isBefore(new Date(membership.endsAt), new Date())) {
    return null;
  }

  // 執行降級為 FREE
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { currentMembershipLevel: "FREE" },
    });

    await tx.userMembership.update({
      where: { id: membership.id },
      data: {
        tierLevel: "FREE",
        status: "expired",
        endsAt: new Date(),
      },
    });
  });

  return { downgradedTo: "FREE" };
}

// ─────────────────────────────────────────────
// 管理員：批次檢查所有過期會員並降級
// 可以放在 cron、或管理員後台手動觸發
// ─────────────────────────────────────────────
export async function runMembershipMaintenance() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("未授權：僅限管理員");
  }

  const now = new Date();

  const expiredMemberships = await db.userMembership.findMany({
    where: {
      endsAt: { lt: now },
      status: "active",
      tierLevel: { not: "FREE" }, // FREE 不需要降級
    },
    include: { user: true },
  });

  const results = [];

  for (const membership of expiredMemberships) {
    await checkAndDowngradeExpired(membership.userId);
    results.push({
      userId: membership.userId,
      username: membership.user.username,
      expiredAt: membership.endsAt,
    });
  }

  return { processed: results.length, results };
}

// ─────────────────────────────────────────────
// 訂單完成時呼叫：增加累計消費 + 檢查自動升級
// ─────────────────────────────────────────────
export async function recordUserSpending(userId: string, amount: number) {
  const user = await db.user.update({
    where: { id: userId },
    data: {
      totalSpent: { increment: amount },
    },
  });

  const upgradeResult = await checkAndApplyAutoUpgrade(userId);

  return {
    totalSpent: user.totalSpent,
    upgradedTo: upgradeResult?.upgradedTo ?? null,
  };
}
