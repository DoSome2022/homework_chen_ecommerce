import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { auth } from "../../../../../auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const discounts = await db.discount.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(discounts);
}