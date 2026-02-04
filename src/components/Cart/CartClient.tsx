// src/app/(user)/cart/page.tsx
"use client";

import useSWR from "swr";
import Image from "next/image";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { Loader2, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import {
  updateCartItemQuantity,
  removeCartItem,
} from "@/action/Cart/route";

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

export default function CartPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: cart, mutate, isLoading } = useSWR<{
    items: CartItem[];
  } | null>("/api/cart", fetcher);

  const handleUpdateQuantity = async (itemId: string, delta: number) => {
    const item = cart?.items.find(i => i.id === itemId);
    if (!item) return;

    const newQty = item.quantity + delta;

    mutate(
      {
        ...cart!,
        items: cart!.items.map(i =>
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
  };

  const handleRemove = async (itemId: string) => {
    await removeCartItem(itemId);
    toast.success("已從購物車移除");
    mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

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
        <div className="lg:col-span-2 space-y-6">
          {cart.items.map((item) => (
            <div key={item.id} className="flex gap-4 border-b pb-6">
              {item.product.img ? (
                <div className="relative w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
                  <Image
                    src={item.product.img}
                    alt={item.product.title || ""}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-xs">無圖片</span>
                </div>
              )}

              <div className="flex-1">
                <h3 className="font-semibold">{item.product.title}</h3>
                <p className="text-sm text-muted-foreground">單位：{item.unit}</p>
                <p className="text-lg font-bold mt-2">
                  ${item.product.price}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleUpdateQuantity(item.id, -1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{item.quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleUpdateQuantity(item.id, 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">訂單摘要</h2>
            <div className="flex justify-between text-xl font-bold">
              <span>總計</span>
              <span>${total.toLocaleString()}</span>
            </div>
            <Button asChild size="lg" className="w-full mt-6">
              <Link href={`/user/${userId}/checkout`}>前往結帳</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}