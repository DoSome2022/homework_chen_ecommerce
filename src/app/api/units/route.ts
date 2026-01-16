// app/api/units/route.ts
"use server";

import { db } from "@/lib/db";
import { NextResponse } from "next/server";



export async function GET() {
  try {
    const units = await db.unit.findMany({
      orderBy: { unit: "asc" },
    });
    return NextResponse.json(units);
  } catch (err) { // ← 改成 err（解決 no-unused-vars）
    console.error("取得單位失敗:", err);
    return NextResponse.json({ error: "取得單位失敗" }, { status: 500 });
  }
}

