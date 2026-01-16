// src/app/(user)/user/[userId]/shop/[productId]/ProductDetail.tsx
"use client";

import useSWR from "swr";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ShoppingCart, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { addToCartAction } from "@/action/Cart/route";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Category = { id: string; name: string };
type Material = { id: string; materials: string };

type Product = {
  id: string;
  title: string | null;
  des: string | null;
  price: string | null;
  img: string | null;
  unit: string[];
  category: Category | null;
  materials: Material[];
};

type ApiResponse = Product | { error: string };

export default function ProductDetail({
  productId,
}: {
  userId: string; // ← 你沒用到，保留但不使用
  productId: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const { data, isLoading } = useSWR<ApiResponse>( // ← 移除 error 變數
    `/api/products/${productId}`,
    fetcher
  );

  // 判斷是否為錯誤回應
  const isErrorResponse = data && "error" in data;
  const product = isErrorResponse ? null : data as Product;

  const handleAddToCart = async () => {
    if (selectedUnits.length === 0) {
      toast.error("請選擇單位");
      return;
    }

    const result = await addToCartAction(productId, selectedUnits, quantity);

    if (result.success) {
      toast.success(result.message || "已加入購物車！");
    } else {
      toast.error(result.error || "加入失敗");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (isErrorResponse) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-red-800 mb-4">商品不存在</h2>
          <p className="text-red-600 mb-8">{(data as { error: string }).error}</p>
          <Button asChild size="lg">
            <Link href="/shop">返回商品列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-24">
        <p className="text-xl text-gray-600">無法載入商品</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-12">
        {/* 左側：圖片 */}
        <div>
          {product.img ? (
            <Image
              src={product.img}
              alt={product.title || ""}
              width={600}
              height={600}
              className="rounded-lg object-cover w-full"
            />
          ) : (
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-96 flex items-center justify-center">
              <span className="text-gray-500 text-xl">無圖片</span>
            </div>
          )}
        </div>

        {/* 右側：資訊 */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-4">{product.title}</h1>
            {product.des && <p className="text-gray-600 text-lg">{product.des}</p>}
          </div>

          <div className="text-4xl font-bold text-primary">
            NT${product.price}
          </div>

          {product.category && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">分類：</span>
              <Badge variant="secondary">{product.category.name}</Badge>
            </div>
          )}

          {product.materials.length > 0 && (
            <div>
              <span className="text-sm text-gray-600">材質：</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {product.materials.map((m) => (
                  <Badge key={m.id} variant="outline">
                    {m.materials}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 單位選擇 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">選擇單位（可多選）</h3>
            <div className="grid grid-cols-3 gap-4">
              {product.unit.map((u) => (
                <div key={u} className="flex items-center space-x-2">
                  <Checkbox
                    id={`unit-${u}`}
                    checked={selectedUnits.includes(u)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUnits([...selectedUnits, u]);
                      } else {
                        setSelectedUnits(selectedUnits.filter((v) => v !== u));
                      }
                    }}
                  />
                  <label htmlFor={`unit-${u}`} className="cursor-pointer">
                    {u}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* 數量 */}
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium">數量：</span>
            <div className="flex items-center border rounded-lg">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-16 text-center text-lg font-medium">
                {quantity}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button size="lg" className="w-full text-lg" onClick={handleAddToCart}>
            <ShoppingCart className="mr-2 h-5 w-5" />
            加入購物車
          </Button>
        </div>
      </div>
    </div>
  );
}