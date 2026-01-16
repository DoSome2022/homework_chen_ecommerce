// src/app/api/cron/membership-check/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export async function GET() {
  const now = new Date();

  const expired = await db.userMembership.findMany({
    where: {
      endsAt: { not: null, lte: now },
      status: 'active',
    },
    include: { user: true },  // 只保留 user 關聯
  });

  for (const sub of expired) {
    await db.$transaction(async (tx) => {
      await tx.userMembership.update({
        where: { id: sub.id },
        data: { status: 'expired' },
      });

      await tx.user.update({
        where: { id: sub.userId },
        data: { currentMembershipLevel: 'FREE' },
      });
    });
  }

  return NextResponse.json({ processed: expired.length });
}