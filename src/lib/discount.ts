// src/lib/discount.ts
import { db } from '@/lib/db';
import { auth } from '../../auth';
import { MembershipLevel } from '@prisma/client';

type CartItem = {
  productId: string;
  quantity: number;
  unit: string;
  product: { price: string | null };
};

type Discount = {
  id: string;
  name: string;
  type: string;
  value: number;
  isPercent: boolean;
  memberOnly: boolean;
  pickupOnly: boolean;
  minAmount: number | null;
};

export async function calculateDiscountedTotal(
  cartItems: CartItem[],
  shippingMethod: string | null,
  userSelectedDiscounts: Discount[] = []
) {
  const session = await auth();
  const userId = session?.user?.id;

  // 獲取用戶實際的會員等級
  let userMembershipLevel: MembershipLevel = MembershipLevel.FREE;
if (userId) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { 
      currentMembershipLevel: true,
      username: true,   // 方便辨識是誰
      email: true
    }
  });
  
  console.log('[discount calc] 使用者資訊:', {
    userId,
    username: user?.username,
    email: user?.email,
    currentMembershipLevel: user?.currentMembershipLevel ?? '未找到 / null',
  });

  if (user?.currentMembershipLevel) {
    userMembershipLevel = user.currentMembershipLevel;
  }
}

  const isPaidMember = 
    userMembershipLevel === MembershipLevel.SILVER ||
    userMembershipLevel === MembershipLevel.GOLD ||
    userMembershipLevel === MembershipLevel.PLATINUM;

console.log('[discount calc] 會員判斷結果:', {
    level: userMembershipLevel,
    isPaidMember,
  });

  // 計算原始商品小計
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product.price ? parseInt(item.product.price, 10) : 0;
    return sum + price * item.quantity;
  }, 0);

  const shippingFee = shippingMethod === 'pickup' ? 0 : 100;

  let discountAmount = 0;
  const appliedDiscounts: string[] = [];

  // 第一步：自動套用會員 9 折（僅商品小計）
  let discountedSubtotal = subtotal;
  if (isPaidMember) {
    const memberDiscount = Math.round(subtotal * 0.1); // 省 10%
    discountAmount += memberDiscount;
    discountedSubtotal = subtotal - memberDiscount;
    appliedDiscounts.push(`${userMembershipLevel} 會員專屬 9 折`);
  }

  if (isPaidMember) {
    const memberDiscount = Math.round(subtotal * 0.1); // 10% off
    discountAmount += memberDiscount;
    appliedDiscounts.push(`會員 ${userMembershipLevel} 9折 (自動) -$${memberDiscount}`);
    console.log('[discount calc] 已套用會員折扣:', memberDiscount);
  }

  // 第二步：處理用戶手動選擇的折扣（基於已打折後的小計）
  for (const discount of userSelectedDiscounts) {
    // 檢查是否適用（這裡使用您原有的 checkDiscountApplicable 邏輯）
    if (!checkDiscountApplicable(discount, isPaidMember, userMembershipLevel, shippingMethod, discountedSubtotal)) {
      continue;
    }

    let discAmt = 0;
    if (discount.isPercent) {
      discAmt = Math.round(discountedSubtotal * (discount.value / 100));
    } else {
      discAmt = discount.value;
    }

    if (discount.minAmount && discountedSubtotal < discount.minAmount) continue;

    discountAmount += discAmt;
    appliedDiscounts.push(discount.name);
  }

  const finalTotal = discountedSubtotal + shippingFee - (discountAmount - (subtotal - discountedSubtotal)); // 修正計算

  return {
    subtotal,
    shippingFee,
    discountAmount,
    finalTotal: Math.max(0, finalTotal),
    appliedDiscounts,
  };
}

function checkDiscountApplicable(
  discount: Discount,
  isMember: boolean,
  userMembershipLevel: MembershipLevel,
  shippingMethod: string | null,
  subtotal: number
): boolean {
  console.log('檢查折扣:', discount.name, {
    memberOnly: discount.memberOnly,
    isMember,
    userMembershipLevel,
    pickupOnly: discount.pickupOnly,
    shippingMethod,
    minAmount: discount.minAmount,
    subtotal
  });
  
  // 檢查會員限制
  if (discount.memberOnly && !isMember) {
    console.log('折扣僅限會員，但用戶非會員');
    return false;
  }
  
  // 檢查自取限制
  if (discount.pickupOnly && shippingMethod !== "pickup") {
    console.log('折扣僅限門市自取');
    return false;
  }
  
  // 檢查最低消費金額
  if (discount.minAmount && subtotal < discount.minAmount) {
    console.log('未達最低消費金額');
    return false;
  }
  
  console.log('折扣適用');
  return true;
}