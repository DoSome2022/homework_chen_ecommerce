import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "../../../../../../auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 15: params 是 Promise，需要使用 await
    const { userId } = await context.params;

    const session = await auth();
    if (!session || session.user.id !== userId) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const orders = await db.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("獲取訂單錯誤:", error);
    return NextResponse.json(
      { error: "伺服器內部錯誤" },
      { status: 500 }
    );
  }
}