// src/app/api/materials/route.ts
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const materials = await db.materials.findMany({
    orderBy: { materials: "asc" },
  });
  return NextResponse.json(materials);
}