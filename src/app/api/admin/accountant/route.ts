// src/app/api/admin/accountant/route.ts

import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { auth } from "../../../../../auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";

  const entries = await db.accountEntry.findMany({
    where: search
      ? {
          OR: [
            { order: { orderNumber: { contains: search, mode: "insensitive" } } },
            { order: { shippingName: { contains: search, mode: "insensitive" } } },
            { order: { shippingPhone: { contains: search } } },
            { order: { items: { some: { title: { contains: search, mode: "insensitive" } } } } },
          ],
        }
      : {},
    include: {
      order: {
        select: {
          orderNumber: true,
          shippingName: true,
          shippingPhone: true,
          createdAt: true,
          items: { select: { title: true } },
        },
      },
    },
    orderBy: { settledAt: "desc" },
  });

  return Response.json(entries);
}