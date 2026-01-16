// src/app/api/user/[userId]/orders/[orderId]/route.ts

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../../auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string; orderId: string }> }
) {
  const { userId, orderId } = await params;

  const session = await auth();

  // 權限驗證：只能看自己的訂單
  if (!session?.user || session.user.id !== userId) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                img: true,
                price: true,

              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }

    // 檢查訂單是否屬於這個使用者
    if (order.userId !== userId) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("取得訂單詳情失敗:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}