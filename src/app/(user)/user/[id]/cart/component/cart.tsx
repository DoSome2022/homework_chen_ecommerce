// src/app/(user)/cart/page.tsx
"use client";

import useSWR from "swr";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";

import {
  removeCartItem,
  updateCartItemQuantity,
} from "@/action/Cart/route";
import { createOrder } from "@/action/Order/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type CartItem = {
  id: string;
  productId: string;
  unit: string;
  quantity: number;
  product: {
    id: string;
    title: string | null;
    img: string | null;
    price: string | null;
  };
};

export default function CartClient() {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const { data: cart, mutate, isLoading } = useSWR<{
    items: CartItem[];
  } | null>("/api/cart", fetcher);

  const handleUpdateQuantity = async (itemId: string, delta: number) => {
    setUpdatingId(itemId);
    const item = cart?.items.find((i) => i.id === itemId);
    if (!item) return;

    const newQty = item.quantity + delta;

    // 樂觀更新
    mutate(
      {
        ...cart!,
        items: cart!.items.map((i) =>
          i.id === itemId ? { ...i, quantity: Math.max(0, newQty) } : i
        ),
      },
      false
    );

    if (newQty <= 0) {
      await removeCartItem(itemId);
      toast.success("已從購物車移除");
    } else {
      await updateCartItemQuantity(itemId, newQty);
      toast.success("數量已更新");
    }

    mutate();
    setUpdatingId(null);
  };

  const handleRemove = async (itemId: string) => {
    setUpdatingId(itemId);
    await removeCartItem(itemId);
    toast.success("已從購物車移除");
    mutate();
    setUpdatingId(null);
  };

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0) {
      toast.error("購物車是空的");
      return;
    }

    setIsCheckingOut(true);
    const formData = new FormData(e.currentTarget);
    const result = await createOrder(formData);

    if ("success" in result && result.success === false) {
      toast.error(result.error || "建立訂單失敗");
    }
    // redirect 會自動跳轉
    setIsCheckingOut(false);
  };

  // 載入中
  if (isLoading || status === "loading") {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  // 未登入
  if (!userId) {
    return (
      <div className="text-center py-24">
        <p className="text-xl mb-6">請先登入以查看購物車</p>
        <Button asChild size="lg">
          <Link href="/login">前往登入</Link>
        </Button>
      </div>
    );
  }

  // 購物車是空的
  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-24">
        <ShoppingBag className="h-24 w-24 text-gray-300 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-800 mb-4">購物車是空的</h2>
        <p className="text-gray-600 mb-8">快去選購你喜歡的商品吧！</p>
        <Button asChild size="lg">
          <Link href={`/user/${userId}/shop`}>去逛逛</Link>
        </Button>
      </div>
    );
  }

  const total = cart.items.reduce((sum, item) => {
    const price = parseInt(item.product.price || "0");
    return sum + price * item.quantity;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">購物車</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 商品列表 */}
        <div className="lg:col-span-2 space-y-6">
          {cart.items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-4 gap-6 items-center">
                  {/* 圖片 */}
                  <div className="relative aspect-square">
                    {item.product.img ? (
                      <Image
                        src={item.product.img}
                        alt={item.product.title || ""}
                        fill
                        className="object-cover rounded-lg"
                      />
                    ) : (
                      <div className="bg-gray-200 rounded-lg w-full h-full" />
                    )}
                  </div>

                  {/* 資訊 */}
                  <div className="md:col-span-2 space-y-3">
                    <h3 className="text-lg font-semibold">
                      {item.product.title || "無標題商品"}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">單位：</span>
                      <Badge variant="secondary">{item.unit}</Badge>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      NT${item.product.price || "0"}
                    </p>
                  </div>

                  {/* 數量 & 刪除 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border rounded-lg">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        disabled={updatingId === item.id}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        value={item.quantity}
                        className="w-16 text-center border-0"
                        readOnly
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        disabled={updatingId === item.id}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(item.id)}
                      disabled={updatingId === item.id}
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 結帳表單（直接在右側） */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">收件資訊 & 結帳</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckout} className="space-y-6">
                <div>
                  <Label htmlFor="name">姓名</Label>
                  <Input name="shippingName" required placeholder="王小明" />
                </div>
                <div>
                  <Label htmlFor="phone">電話</Label>
                  <Input name="shippingPhone" required placeholder="0912345678" />
                </div>
                <div>
                  <Label htmlFor="address">地址</Label>
                  <Textarea
                    name="shippingAddress"
                    required
                    rows={3}
                    placeholder="台北市大安區復興南路一段390號"
                  />
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between text-2xl font-bold mb-6">
                    <span>總計</span>
                    <span className="text-primary">NT${total.toLocaleString()}</span>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        處理中...
                      </>
                    ) : (
                      "確認下單"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}