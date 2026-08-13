// src/app/api/admin/user/[userId]/route.ts
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth'; // 請調整正確路徑

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      currentMembershipLevel: true,
      createdAt: true,
      updatedAt: true,
      membership: {
        select: {
          tierLevel: true,
          status: true,
          startsAt: true,
          endsAt: true,
          autoRenew: true,
          tier: {
            select: {
              name: true,
              color: true,
              benefits: true,
              price: true,
            },
          },
        },
      },
      Order: {
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
          shippingMethod: true,
          shippingAddress: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: '用戶不存在' }, { status: 404 });
  }

  return NextResponse.json(user);
}
