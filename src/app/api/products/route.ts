
// app/api/products/route.ts  ← 只負責讀資料！超乾淨！
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { 
      category: true ,
      materials: true,
    },
  });
  return NextResponse.json(products);
}