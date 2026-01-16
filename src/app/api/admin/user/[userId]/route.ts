// src/app/api/admin/user/[userId]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '../../../../../../auth';

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ userId: string }> } // params 是 Promise
) {
  // 解開 Promise 獲取 userId
  const { userId } = await params;
  
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId }, // 使用解開後的 userId
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
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
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: '用戶不存在' }, { status: 404 });
  }

  return NextResponse.json(user);
}