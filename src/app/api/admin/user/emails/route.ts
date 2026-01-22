// src/app/api/admin/users/emails/route.ts
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { auth } from "../../../../../../auth";

export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[GET /api/admin/users/emails] 錯誤:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}