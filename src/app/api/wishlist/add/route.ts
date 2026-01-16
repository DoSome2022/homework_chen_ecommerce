// src/app/api/wishlist/add/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "../../../../../auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await req.json();

  if (!productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        wishlist: {
          connect: { id: productId },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // 記錄錯誤以便除錯（使用 error 變數，避免 unused 警告）
    console.error("Failed to add product to wishlist:", error);

    // 常見錯誤：已存在於願望清單（Prisma 會拋 Unique constraint）
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "此商品已在願望清單中" }, { status: 400 });
    }

    return NextResponse.json({ error: "加入願望清單失敗，請稍後再試" }, { status: 500 });
  }
}