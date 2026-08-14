// src/app/api/orders/[orderId]/summary/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '../../../../../../auth'; // 依實際路徑調整

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> } // ✅ 改這裡
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  // ✅ 新增：await params
  const { orderId } = await params;

  const order = await db.order.findUnique({
    where: { id: orderId }, // ✅ 改用解構後的變數
    select: {
      id: true,
      userId: true,
      orderNumber: true,
      total: true,
      shippingFee: true,
      shippingMethod: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: '訂單不存在' }, { status: 404 });
  }

  // 只允許本人或管理員查看
  if (order.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    order: {
      ...order,
      productAmount: order.total - order.shippingFee,
    },
  });
}
