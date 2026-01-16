// app/api/admin/membership-tiers/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '../../../../../auth';


export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const tiers = await db.membershipTier.findMany({
    orderBy: { price: 'asc' },
  });

  return NextResponse.json(tiers);
}