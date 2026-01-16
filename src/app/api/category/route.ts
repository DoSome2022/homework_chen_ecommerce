// src/app/api/categories/route.ts
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { category: "asc" },
  });
  return NextResponse.json(categories);
}