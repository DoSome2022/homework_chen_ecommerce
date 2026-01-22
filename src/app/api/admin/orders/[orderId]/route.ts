// src/app/api/admin/orders/[orderId]/route.ts
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        returnRequest: true,
        user: {                         // ← 只要這一個！
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

    return NextResponse.json(order);
  } catch (error) {
    console.error("取得訂單詳情失敗:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}