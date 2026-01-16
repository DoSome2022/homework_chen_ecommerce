// src/actions/renewalActions.ts
"use server";

import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { addMonths } from "date-fns";
import { MembershipLevel } from "@prisma/client";

export async function submitRenewalRequest(targetLevel: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授權：請先登入");
  }

  const userId = session.user.id;
  const currentLevel = session.user.currentMembershipLevel as string;

  // 驗證 targetLevel 是否為合法的 MembershipLevel 值
const validLevels: readonly string[] = ['FREE', 'SILVER', 'GOLD', 'PLATINUM'];
  if (!validLevels.includes(targetLevel)) {
    throw new Error("無效的會員等級，請選擇 SILVER、GOLD 或 PLATINUM");
  }

  // 判斷申請類型
  let actionType: 'UPGRADE' | 'RENEWAL' = 'RENEWAL';

  if (currentLevel === 'FREE') {
    if (targetLevel === 'FREE') {
      throw new Error("免費會員無法申請相同等級");
    }
    actionType = 'UPGRADE';
  } else {
    const isExpired = session.user.isMembershipExpired ?? true;
    if (!isExpired) {
      throw new Error("您的會員資格尚未過期，暫不開放續訂或升級");
    }

    if (targetLevel === currentLevel) {
      actionType = 'RENEWAL';
    } else if (
      (targetLevel === 'SILVER' && currentLevel === 'FREE') ||
      (targetLevel === 'GOLD'   && ['FREE', 'SILVER'].includes(currentLevel)) ||
      (targetLevel === 'PLATINUM' && ['FREE', 'SILVER', 'GOLD'].includes(currentLevel))
    ) {
      actionType = 'UPGRADE';
    } else {
      throw new Error("不允許降級或無效升級路徑");
    }
  }

  // 直接建立申請，使用 enum 值存入 tierLevel
  await db.renewalRequest.create({
    data: {
      userId,
      tierLevel: targetLevel as MembershipLevel,
      status: "PENDING",
    },
  });

  return { 
    success: true, 
    message: actionType === 'UPGRADE' ? "升級申請已提交" : "續訂申請已提交" 
  };
}

// Action 2: 管理員批准續訂/升級
export async function approveRenewalRequest(
  requestId: string,
  renewalDurationMonths: number = 12
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("未授權：僅限管理員");
  }

  // 使用事務確保一致性
  return await db.$transaction(async (tx) => {
    const request = await tx.renewalRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new Error("找不到此續訂請求");
    }

    if (request.status !== "PENDING") {
      throw new Error("此請求已處理過");
    }

    // 1. 更新 User 的 currentMembershipLevel
    await tx.user.update({
      where: { id: request.userId },
      data: {
        currentMembershipLevel: request.tierLevel,
      },
    });

    const latestMembership = await tx.userMembership.findFirst({
      where: { userId: request.userId },
      orderBy: { startsAt: "desc" },
    });

    if (latestMembership) {
      const currentEndsAt = latestMembership.endsAt || new Date();
      const newEndsAt = addMonths(currentEndsAt, renewalDurationMonths);

      // 2. 更新 UserMembership
      await tx.userMembership.update({
        where: { id: latestMembership.id },
        data: {
          tierLevel: request.tierLevel,
          endsAt: newEndsAt,
          status: "active",
        },
      });
    } else {
      const now = new Date();
      
      // 2. 創建新的 UserMembership
      await tx.userMembership.create({
        data: {
          userId: request.userId,
          tierLevel: request.tierLevel,
          startsAt: now,
          endsAt: addMonths(now, renewalDurationMonths),
          status: "active",
          autoRenew: true,
        },
      });
    }

    // 3. 更新 RenewalRequest 狀態
    await tx.renewalRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        processedAt: new Date(),
      },
    });

    return { success: true, message: "已成功處理申請" };
  });
}

// Action 3: 管理員拒絕續訂/升級
export async function rejectRenewalRequest(requestId: string, notes?: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("未授權：僅限管理員");
  }

  const request = await db.renewalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("找不到此續訂請求");
  }

  if (request.status !== "PENDING") {
    throw new Error("此請求已處理過");
  }

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