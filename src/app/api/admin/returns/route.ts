// src/app/api/admin/returns/route.ts
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { auth } from "../../../../../auth";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const requests = await db.returnRequest.findMany({
    where: { status: "PENDING" },
    include: {
      order: { select: { orderNumber: true, total: true } },
      user: { select: { username: true, email: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(requests);
}