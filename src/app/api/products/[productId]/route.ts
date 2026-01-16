// src/app/api/products/[productId]/route.ts
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params; // ← 這行解決一切！

  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        materials: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("取得商品詳情失敗:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}