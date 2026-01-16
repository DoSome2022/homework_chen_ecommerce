import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '../../../../../auth';
import { UserRole } from '@prisma/client';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roleParam = searchParams.get('role');

  let role: UserRole | undefined = undefined;

  if (roleParam === 'USER' || roleParam === 'ADMIN') {
    role = roleParam;
  }

  const users = await db.user.findMany({
    where: { role },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}