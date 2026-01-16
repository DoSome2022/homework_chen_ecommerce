// src/app/checkout/CheckoutForm.tsx
'use client';

import { useTransition, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  User,
  Store,
  ShoppingCart,
  Crown,
  Gem,
  Star,
  Clock,
} from 'lucide-react';
import { createOrder } from '@/action/Order/route';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserMembership } from '@prisma/client';

// 定義結帳表單 schema
const checkoutSchema = z.object({
  shippingName: z.string().min(2, { message: '請輸入收件人姓名（至少 2 個字）' }),
  shippingPhone: z.string().regex(/^09\d{8}$/, { message: '請輸入正確的手機號碼（09 開頭共 10 碼）' }),
  shippingAddress: z.string().min(5, { message: '請輸入完整地址（至少 5 個字）' }),
  shippingMethod: z.enum(['delivery', 'pickup']),
  notes: z.string().optional(),
  transferProof: z.instanceof(File).optional(),
  selectedDiscounts: z.array(z.string()).optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

// 折扣資訊型別
type DiscountInfo = {
  id: string;
  name: string;
  code: string | null;
  type: string;
  value: number;
  isPercent: boolean;
  applied: boolean;
  discountAmount: number;
  originalAmount: number;
  memberOnly: boolean;
  pickupOnly: boolean;
  minAmount: number | null;
  reason?: string;
  description: string;
};

type DiscountResponse = {
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  finalTotal: number;
  appliedDiscounts: DiscountInfo[];
  availableDiscounts: DiscountInfo[];
  unavailableDiscounts: DiscountInfo[];
  userMembership: {
    level: string;
    info: UserMembership | null;
  };
};

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error('API 請求失敗');
    }
    return res.json();
  });

// 會員等級映射
const membershipConfig = {
  FREE: {
    name: '免費會員',
    icon: User,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    badgeColor: 'bg-gray-200 text-gray-800',
    description: '基本會員權益',
  },
  SILVER: {
    name: '銀級會員',
    icon: Star,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    badgeColor: 'bg-gray-300 text-gray-800',
    description: '享專屬折扣優惠',
  },
  GOLD: {
    name: '金級會員',
    icon: Gem,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    badgeColor: 'bg-yellow-500 text-white',
    description: '享更多專屬優惠',
  },
  PLATINUM: {
    name: '白金會員',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    badgeColor: 'bg-purple-600 text-white',
    description: '最高級會員權益',
  },
};

export default function CheckoutForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [showAllDiscounts, setShowAllDiscounts] = useState(false);
  const [selectedDiscountIds, setSelectedDiscountIds] = useState<string[]>([]);
  const [shippingMethod, setShippingMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [cartSubtotal, setCartSubtotal] = useState<number>(0);
  const [cartItemsCount, setCartItemsCount] = useState<number>(0);

  // 從購物車取得實際金額
  useEffect(() => {
    async function fetchCartData() {
      try {
        const response = await fetch('/api/cart/total');
        if (!response.ok) {
          throw new Error('購物車 API 請求失敗');
        }
        const data = await response.json();

        if (data.success) {
          setCartSubtotal(data.subtotal);
          setCartItemsCount(data.itemsCount);
        } else {
          console.error('購物車 API 錯誤:', data.error);
          toast.error('無法取得購物車資料');
        }
      } catch (error) {
        console.error('取得購物車資料失敗:', error);
        toast.error('無法取得購物車資料，請重新整理頁面');
      }
    }

    fetchCartData();
  }, []);

  // 從後端取得即時折扣資訊 - 修正這裡
  const { 
    data: discountData, 
    isLoading: discountLoading, 
    mutate 
  } = useSWR<DiscountResponse>(
    cartSubtotal > 0 ? `/api/checkout/discounts?shippingMethod=${shippingMethod}&subtotal=${cartSubtotal}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      onError: (error) => {
        console.error('獲取折扣資訊失敗:', error);
        toast.error('無法取得折扣資訊');
      },
    }
  );

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingName: '',
      shippingPhone: '',
      shippingAddress: '',
      shippingMethod: 'delivery',
      notes: '',
      selectedDiscounts: [],
    },
  });

  // 當物流方式改變時重新計算折扣
  useEffect(() => {
    if (shippingMethod && cartSubtotal > 0) {
      mutate();
    }
  }, [shippingMethod, cartSubtotal, mutate]);

  // const onSubmit = (data: CheckoutFormData) => {
  //   const formData = new FormData();

  //   formData.append('shippingName', data.shippingName);
  //   formData.append('shippingPhone', data.shippingPhone);
  //   formData.append('shippingAddress', data.shippingAddress);
  //   formData.append('shippingMethod', data.shippingMethod);

  //   const shippingFee = data.shippingMethod === 'pickup' ? 0 : 100;
  //   formData.append('shippingFee', shippingFee.toString());

  //   if (data.notes) formData.append('notes', data.notes);
  //   if (data.transferProof) {
  //     formData.append('transferProof', data.transferProof);
  //   }

  //   if (selectedDiscountIds.length > 0) {
  //     formData.append('selectedDiscounts', JSON.stringify(selectedDiscountIds));
  //   }

  //   startTransition(async () => {
  //     try {
  //       const result = await createOrder(formData);

  //       if (result && 'success' in result && !result.success) {
  //         toast.error(result.error ?? '訂單建立失敗');
  //         return;
  //       }

  //       toast.success('訂單已成功建立');
  //       router.push('/checkout/success');
  //       router.refresh();
  //     } catch (error) {
  //       toast.error('訂單建立失敗，請稍後再試');
  //     }
  //   });
  // };

const onSubmit = (data: CheckoutFormData) => {
  const formData = new FormData();

  formData.append('shippingName', data.shippingName);
  formData.append('shippingPhone', data.shippingPhone);
  formData.append('shippingAddress', data.shippingAddress);
  formData.append('shippingMethod', data.shippingMethod);

  const shippingFee = data.shippingMethod === 'pickup' ? 0 : 100;
  formData.append('shippingFee', shippingFee.toString());

  if (data.notes) formData.append('notes', data.notes);
  if (data.transferProof) {
    formData.append('transferProof', data.transferProof);
  }

  if (selectedDiscountIds.length > 0) {
    formData.append('selectedDiscounts', JSON.stringify(selectedDiscountIds));
  }

  startTransition(async () => {
    try {
      const result = await createOrder(formData);

      if (result && 'success' in result && !result.success) {
        toast.error(result.error ?? '訂單建立失敗');
        return;
      }

      toast.success('訂單已成功建立');
      router.push('/checkout/success');
      router.refresh();
    } catch (err) {
      console.error('訂單建立失敗:', err);
      const errorMessage = err instanceof Error ? err.message : '訂單建立失敗';
      toast.error(`訂單建立失敗: ${errorMessage}`);
    }
  });
};

  const handleDiscountToggle = (discountId: string) => {
    setSelectedDiscountIds((prev) => {
      if (prev.includes(discountId)) {
        return prev.filter((id) => id !== discountId);
      } else {
        return [...prev, discountId];
      }
    });
  };

  // 安全存取折扣資料，提供預設值
  const subtotal = discountData?.subtotal ?? cartSubtotal;
  const shippingFee = discountData?.shippingFee ?? (shippingMethod === 'pickup' ? 0 : 100);
  const discountAmount = discountData?.discountAmount ?? 0;
  const finalTotal = discountData?.finalTotal ?? (subtotal + shippingFee);
  const availableDiscounts = discountData?.availableDiscounts ?? [];
  const unavailableDiscounts = discountData?.unavailableDiscounts ?? [];
  const userMembership = discountData?.userMembership ?? { level: 'FREE', info: null };

  const membershipLevel = userMembership.level as keyof typeof membershipConfig;
  const membership = membershipConfig[membershipLevel] || membershipConfig.FREE;
  const MemberIcon = membership.icon;

  const ninetyPercentDiscountId = availableDiscounts.find((d) => d.value === 90 && d.isPercent)?.id;
  const hasNinetyPercentDiscount = ninetyPercentDiscountId ? selectedDiscountIds.includes(ninetyPercentDiscountId) : false;

  // 計算 90% 折扣的價格（如果需要可以加回）
  // const calculate90PercentDiscount = (baseAmount: number) => {
  //   return Math.floor(baseAmount * 0.9);
  // };
  // const priceAfter90Discount = calculate90PercentDiscount(subtotal + shippingFee);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">結帳資料填寫</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 會員等級資訊 */}
        <div className={`border rounded-lg p-4 ${membership.bgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${membership.bgColor}`}>
                <MemberIcon className={`h-6 w-6 ${membership.color}`} />
              </div>
              <div>
                <h4 className="font-medium">您的會員等級</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={membership.badgeColor}>{membership.name}</Badge>
                  <span className="text-sm text-gray-600">{membership.description}</span>
                </div>
                {userMembership.info?.endsAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    會員有效至: {new Date(userMembership.info.endsAt).toLocaleDateString('zh-TW')}
                  </p>
                )}
              </div>
            </div>
            {membershipLevel !== 'FREE' && (
              <div className="text-right">
                <div className="text-sm text-gray-600">專屬會員折扣已套用</div>
                <div className="text-lg font-bold text-green-600">
                  {availableDiscounts.filter((d) => d.memberOnly && d.applied).length} 個
                </div>
              </div>
            )}
          </div>

          {membershipLevel === 'FREE' && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-700">升級為付費會員可解鎖更多專屬折扣優惠！</p>
              </div>
            </div>
          )}
        </div>

        {/* 購物車摘要 */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-medium">購物車摘要</h4>
                <p className="text-sm text-gray-600">
                  {cartItemsCount} 件商品 • 商品小計: ${cartSubtotal.toLocaleString()}
                </p>
              </div>
            </div>
            <Badge variant="outline">總計: ${(cartSubtotal + shippingFee).toLocaleString()}</Badge>
          </div>
        </div>

        {/* 折扣與總額明細區塊 */}
        <div className="border rounded-lg p-6 bg-muted/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">折扣與總額明細</h3>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">
                共 {availableDiscounts.length} 個可用折扣
              </span>
            </div>
          </div>

          {/* 物流方式選擇 */}
          <div className="mb-6 p-4 bg-white rounded-md border">
            <Label className="text-sm font-medium mb-3 block">選擇配送方式</Label>
            <RadioGroup
              value={shippingMethod}
              onValueChange={(value: 'delivery' | 'pickup') => {
                setShippingMethod(value);
                form.setValue('shippingMethod', value);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delivery" id="delivery" />
                <Label htmlFor="delivery" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span>宅配到府</span>
                    <Badge variant="secondary" className="ml-2">+$100</Badge>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pickup" id="pickup" />
                <Label htmlFor="pickup" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span>門市自取</span>
                    <Badge variant="outline" className="ml-2">免運費</Badge>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 折扣選擇區 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-sm font-medium">選擇適用的折扣優惠</Label>
              {unavailableDiscounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllDiscounts(!showAllDiscounts)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {showAllDiscounts ? '隱藏' : '顯示'}所有折扣
                  {showAllDiscounts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>

            {cartSubtotal === 0 ? (
              <div className="text-center py-4 text-muted-foreground">購物車是空的，請先添加商品</div>
            ) : discountLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                載入折扣中...
              </div>
            ) : (
              <div className="space-y-3">
                {/* 特別顯示 90% 折扣選項 */}
                {availableDiscounts.some((d) => d.value === 90 && d.isPercent) && (
                  <div className="relative">
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-red-600 text-white">限時優惠</Badge>
                    </div>
                    <div
                      className={`p-3 border-2 rounded-md cursor-pointer transition-all border-red-300 bg-red-50 ${
                        selectedDiscountIds.includes(ninetyPercentDiscountId || '') ? 'ring-2 ring-red-500' : ''
                      }`}
                      onClick={() => {
                        const discount = availableDiscounts.find((d) => d.value === 90 && d.isPercent);
                        if (discount) handleDiscountToggle(discount.id);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedDiscountIds.includes(ninetyPercentDiscountId || '')}
                            onChange={() => {
                              const discount = availableDiscounts.find((d) => d.value === 90 && d.isPercent);
                              if (discount) handleDiscountToggle(discount.id);
                            }}
                            className="mt-1"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-red-700">🔥 限時 9 折優惠</span>
                              <Badge variant="outline" className="text-xs bg-red-100">
                                <Clock className="h-3 w-3 mr-1" />
                                限時優惠
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              全站商品 90% 優惠，結帳時自動扣除
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-red-600 font-bold text-lg">
                            -${Math.floor((subtotal + shippingFee) * 0.1).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground line-through">
                            ${(subtotal + shippingFee).toLocaleString()}
                          </div>
                          {/* 此處原本有 priceAfter90Discount，可視需求加回 */}
                          {/* <div className="text-sm font-bold text-red-700">
                            僅需 ${priceAfter90Discount.toLocaleString()}
                          </div> */}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 其他可用折扣 */}
                {availableDiscounts
                  .filter((d) => !(d.value === 90 && d.isPercent))
                  .map((disc) => (
                    <div
                      key={disc.id}
                      className={`p-3 border rounded-md cursor-pointer transition-all ${
                        selectedDiscountIds.includes(disc.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleDiscountToggle(disc.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedDiscountIds.includes(disc.id)}
                            onChange={() => handleDiscountToggle(disc.id)}
                            className="mt-1"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{disc.name}</span>
                              {disc.memberOnly && (
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  會員專屬
                                </Badge>
                              )}
                              {disc.pickupOnly && (
                                <Badge variant="outline" className="text-xs">
                                  <Store className="h-3 w-3 mr-1" />
                                  門市自取
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {disc.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-600 font-medium">
                            -${disc.discountAmount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground line-through">
                            ${disc.originalAmount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                {availableDiscounts.length === 0 && (
                  <p className="text-muted-foreground text-sm">目前無可用折扣</p>
                )}

                {/* 不可用折扣（折疊顯示） */}
                {showAllDiscounts && unavailableDiscounts.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      不符合條件的折扣
                    </div>
                    {unavailableDiscounts.map((disc) => (
                      <div
                        key={disc.id}
                        className="p-3 border border-gray-200 rounded-md opacity-60"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                              <span className="font-medium">{disc.name}</span>
                              {disc.memberOnly && (
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  會員專屬
                                </Badge>
                              )}
                              {disc.pickupOnly && (
                                <Badge variant="outline" className="text-xs">
                                  <Store className="h-3 w-3 mr-1" />
                                  門市自取
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {disc.description}
                            </p>
                            {disc.reason && (
                              <p className="text-sm text-red-600 mt-1">
                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                {disc.reason}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground">
                              -${disc.discountAmount.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${disc.originalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* 總計區域 */}
          <div className="mt-6 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>商品小計</span>
              <span>${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>運費</span>
              <span>${shippingFee.toLocaleString()}</span>
            </div>

            {hasNinetyPercentDiscount && (
              <div className="border-l-4 border-red-500 pl-3 py-2 bg-red-50 rounded-r">
                <div className="flex justify-between text-sm text-red-700 font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    限時 9 折優惠
                  </span>
                  <span>-${Math.floor((subtotal + shippingFee) * 0.1).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">原價</span>
                  <span className="text-gray-600 line-through">
                    ${(subtotal + shippingFee).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between text-sm text-red-600 font-medium">
              <span>折扣總額</span>
              <span>-${discountAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>應付總額</span>
              <div className="text-right">
                <div className="text-primary text-2xl">
                  ${finalTotal.toLocaleString()}
                </div>
                {hasNinetyPercentDiscount && (
                  <div className="text-sm text-green-600 mt-1">
                    ✓ 已套用 9 折優惠，節省 ${Math.floor((subtotal + shippingFee) * 0.1).toLocaleString()}
                  </div>
                )}
                {membershipLevel !== 'FREE' && (
                  <div className="text-sm text-blue-600 mt-1">
                    <CheckCircle2 className="h-3 w-3 inline mr-1" />
                    {membership.name}專屬折扣已套用
                  </div>
                )}
              </div>
            </div>

            {selectedDiscountIds.length > 0 && (
              <div className="mt-2 text-sm text-blue-600">
                <CheckCircle2 className="h-4 w-4 inline mr-1" />
                已選擇 {selectedDiscountIds.length} 個折扣優惠
              </div>
            )}
          </div>
        </div>

        {/* 結帳表單 */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="shippingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>收件人姓名</FormLabel>
                    <FormControl>
                      <Input placeholder="王小明" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shippingPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>手機號碼</FormLabel>
                    <FormControl>
                      <Input placeholder="0912345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="shippingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>收件地址</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="台北市中山區XX路XX號"
                      {...field}
                      disabled={shippingMethod === 'pickup'}
                    />
                  </FormControl>
                  {shippingMethod === 'pickup' && (
                    <p className="text-sm text-muted-foreground">門市自取無需填寫地址</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>備註（選填）</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：請放在門口..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transferProof"
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>上傳銀行轉帳證明（選填，一張圖片）</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        onChange(file || undefined);
                      }}
                      {...field}
                      value={undefined}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-gray-500">僅支援 JPG/PNG，最大 5MB</p>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending || discountLoading || cartSubtotal === 0}
            >
              {cartSubtotal === 0 ? (
                '購物車為空'
              ) : isPending ? (
                <>
                  處理訂單中... <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                '確認送出訂單'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}