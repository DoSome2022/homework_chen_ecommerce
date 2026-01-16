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
      select: { currentMembershipLevel: true }
    });
    
    // 確保使用正確的 enum 值
    if (user?.currentMembershipLevel) {
      userMembershipLevel = user.currentMembershipLevel;
    }
    
    console.log('用戶會員等級 (資料庫):', userMembershipLevel);
  }
  
  // 檢查是否為會員（非 FREE 即為會員）
  const isMember = userMembershipLevel !== MembershipLevel.FREE;
  console.log('是否為會員:', isMember, '會員等級:', userMembershipLevel);

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product.price ? parseInt(item.product.price) : 0;
    return sum + price * item.quantity;
  }, 0);

  // 取得所有有效的折扣規則
  const now = new Date();
  const activeDiscounts = await db.discount.findMany({
    where: {
      startAt: { lte: now },
      OR: [{ endAt: null }, { endAt: { gte: now } }],
    },
  });

  let finalTotal = subtotal;
  const appliedDiscounts: string[] = [];

  // 處理用戶選擇的折扣
  for (const discount of [...activeDiscounts, ...userSelectedDiscounts]) {
    // 避免重複處理同一個折扣
    if (appliedDiscounts.includes(discount.name)) continue;

    // 檢查適用條件
    const isApplicable = checkDiscountApplicable(
      discount, 
      isMember, 
      userMembershipLevel, // 傳入完整的會員等級
      shippingMethod, 
      subtotal
    );

    if (isApplicable) {
      let discountAmount = 0;
      if (discount.isPercent) {
        discountAmount = Math.floor(subtotal * discount.value / 100);
      } else {
        discountAmount = discount.value;
      }

      finalTotal = Math.max(0, finalTotal - discountAmount);
      appliedDiscounts.push(discount.name);
      console.log(`套用折扣: ${discount.name}, 金額: ${discountAmount}`);
    }
  }

  console.log('最終總額:', finalTotal, '折扣總額:', subtotal - finalTotal);

  return {
    subtotal,
    finalTotal,
    discountAmount: subtotal - finalTotal,
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