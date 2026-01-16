import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { auth } from "../../../../../auth";


// 類似以上
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await req.json();

  await db.user.update({
    where: { id: session.user.id },
    data: {
      wishlist: {
        disconnect: { id: productId },
      },
    },
  });
  return NextResponse.json({ success: true });
}