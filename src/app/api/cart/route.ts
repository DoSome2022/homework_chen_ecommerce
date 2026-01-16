// src/app/api/cart/route.ts

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ items: [] });
  }

  const cart = await db.cart.findUnique({
    where: { userId: session.user.id },
    include: {
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
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return NextResponse.json(cart || { items: [] });
}