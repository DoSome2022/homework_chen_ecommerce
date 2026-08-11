// src/app/api/admin/accountant/route.ts

import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { auth } from "../../../../../auth";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const paymentMethod = searchParams.get("paymentMethod") || "";

  // ✅ 使用 Prisma 的官方型別
  const where: Prisma.AccountEntryWhereInput = {};

  if (search) {
    where.OR = [
      { order: { orderNumber: { contains: search, mode: "insensitive" } } },
      { order: { shippingName: { contains: search, mode: "insensitive" } } },
      { order: { shippingPhone: { contains: search } } },
      { order: { items: { some: { title: { contains: search, mode: "insensitive" } } } } },
    ];
  }

  // ✅ 只有在 paymentMethod 不是 'all' 且有值時才加入篩選
  if (paymentMethod && paymentMethod !== 'all') {
    where.order = {
      paymentMethod: paymentMethod,
    };
  }

  const entries = await db.accountEntry.findMany({
    where,
    include: {
      order: {
        select: {
          orderNumber: true,
          shippingName: true,
          shippingPhone: true,
          createdAt: true,
          paymentMethod: true,
          items: { select: { title: true } },
        },
      },
    },
    orderBy: { settledAt: "desc" },
  });

  return Response.json(entries);
}