// src/app/api/cart/total/route.ts
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { auth } from '../../../../../auth';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: '請先登入',
        subtotal: 0,
        itemsCount: 0,
        items: []
      });
    }

    const userId = session.user.id;

    // 取得購物車資料
    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                img: true
              }
            }
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({
        success: true,
        subtotal: 0,
        itemsCount: 0,
        items: []
      });
    }

    // 計算總金額
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.product.price ? parseInt(item.product.price) : 0;
      return sum + price * item.quantity;
    }, 0);

    const itemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return NextResponse.json({
      success: true,
      subtotal,
      itemsCount,
      items: cart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        title: item.product.title,
        quantity: item.quantity,
        unit: item.unit,
        price: item.product.price ? parseInt(item.product.price) : 0,
        image: item.product.img
      }))
    });
  } catch (error) {
    console.error('取得購物車總金額失敗:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '取得購物車資料失敗',
        subtotal: 0,
        itemsCount: 0,
        items: []
      },
      { status: 500 }
    );
  }
}