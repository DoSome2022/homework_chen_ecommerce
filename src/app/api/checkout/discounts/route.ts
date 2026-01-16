// src/app/api/checkout/discounts/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { MembershipLevel } from '@prisma/client';
import { auth } from '../../../../../auth';
import { Discount } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const searchParams = request.nextUrl.searchParams;
    const shippingMethod = searchParams.get('shippingMethod') || 'delivery';
    const subtotal = parseInt(searchParams.get('subtotal') || '0');

    console.log('API - 用戶ID:', userId);
    console.log('API - session user:', session?.user);

    // 獲取當前用戶的會員等級
    let userMembershipLevel: MembershipLevel = MembershipLevel.FREE;
    let userMembershipInfo = null;
    
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { 
          currentMembershipLevel: true,
          username: true,
          email: true
        }
      });
      
      // 使用 Prisma enum 值
      userMembershipLevel = user?.currentMembershipLevel || MembershipLevel.FREE;
      
      console.log('API - 資料庫查詢會員等級:', userMembershipLevel);

      // 獲取用戶的會員詳細資訊
      if (userMembershipLevel !== MembershipLevel.FREE) {
        userMembershipInfo = await db.userMembership.findFirst({
          where: { 
            userId,
            status: 'active',
            tierLevel: userMembershipLevel // 確保匹配會員等級
          },
          orderBy: { endsAt: 'desc' },
          include: {
            user: {
              select: {
                username: true,
                email: true
              }
            }
          }
        });
      }
    }

    console.log('API - 最終會員等級:', userMembershipLevel);
    console.log('API - 是否為會員:', userMembershipLevel !== MembershipLevel.FREE);

    // 獲取所有有效的折扣
    const now = new Date();
    const allDiscounts = await db.discount.findMany({
      where: {
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('API - 總折扣數量:', allDiscounts.length);

    // 計算每個折扣是否適用
    const discountInfo = allDiscounts.map((discount) => {
      const isMember = userMembershipLevel !== MembershipLevel.FREE;
      const isMemberEligible = !discount.memberOnly || isMember;
      const isPickupEligible = !discount.pickupOnly || shippingMethod === 'pickup';
      const isAmountEligible = !discount.minAmount || subtotal >= discount.minAmount;
      
      const isApplicable = isMemberEligible && isPickupEligible && isAmountEligible;
      
      console.log(`折扣 ${discount.name}:`, {
        memberOnly: discount.memberOnly,
        isMember,
        isMemberEligible,
        isPickupEligible,
        isAmountEligible,
        isApplicable
      });

      let discountAmount = 0;
      if (isApplicable) {
        if (discount.isPercent) {
          discountAmount = Math.floor(subtotal * discount.value / 100);
        } else {
          discountAmount = discount.value;
        }
      }

      // 計算原價
      const originalAmount = isApplicable ? subtotal + discountAmount : subtotal;

      return {
        id: discount.id,
        name: discount.name,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        isPercent: discount.isPercent,
        applied: isApplicable,
        discountAmount,
        originalAmount,
        memberOnly: discount.memberOnly,
        pickupOnly: discount.pickupOnly,
        minAmount: discount.minAmount,
        reason: !isApplicable ? 
          (!isMemberEligible ? '限會員專用' : 
           !isPickupEligible ? '限門市自取' : 
           !isAmountEligible ? `未達最低消費$${discount.minAmount}` : '') : '',
        description: getDiscountDescription(discount),
      };
    });

    // 計算總折扣金額
    const totalDiscountAmount = discountInfo
      .filter(d => d.applied)
      .reduce((sum, d) => sum + d.discountAmount, 0);

    const shippingFee = shippingMethod === 'pickup' ? 0 : 100;

    console.log('API - 可用折扣數量:', discountInfo.filter(d => d.applied).length);
    console.log('API - 總折扣金額:', totalDiscountAmount);

    return NextResponse.json({
      subtotal,
      shippingFee,
      discountAmount: totalDiscountAmount,
      finalTotal: Math.max(0, subtotal + shippingFee - totalDiscountAmount),
      appliedDiscounts: discountInfo,
      availableDiscounts: discountInfo.filter(d => d.applied),
      unavailableDiscounts: discountInfo.filter(d => !d.applied),
      userMembership: {
        level: userMembershipLevel,
        info: userMembershipInfo,
      },
    });
  } catch (error) {
    console.error('API - 獲取折扣資訊失敗:', error);
    return NextResponse.json(
      { 
        error: '獲取折扣資訊失敗',
        subtotal: 0,
        shippingFee: 0,
        discountAmount: 0,
        finalTotal: 0,
        appliedDiscounts: [],
        availableDiscounts: [],
        unavailableDiscounts: [],
        userMembership: { level: 'FREE', info: null }
      },
      { status: 500 }
    );
  }
}

function getDiscountDescription(discount: Discount): string {
  const valueDisplay = discount.isPercent ? `${discount.value}%` : `$${discount.value}`;
  const conditions = [];
  
  if (discount.memberOnly) conditions.push('限會員');
  if (discount.pickupOnly) conditions.push('限門市自取');
  if (discount.minAmount) conditions.push(`滿$${discount.minAmount}`);
  
  const conditionsStr = conditions.length > 0 ? ` (${conditions.join('、')})` : '';
  
  return `${discount.name}: 折扣${valueDisplay}${conditionsStr}`;
}