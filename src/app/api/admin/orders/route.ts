import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";

// src/app/api/admin/orders/route.ts
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const orders = await db.order.findMany({
    include: {
      user: true,
      items: true,
      
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}