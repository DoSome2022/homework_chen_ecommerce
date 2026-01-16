// src/components/ProductDetailView.tsx （純 Client Component！）
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Product = {
  id: string;
  title: string | null;
  price: string | null;
  img: string | null;
  des?: string | null;
  unit: string[];
  category?: { category: string } | null;
};

export default function ProductDetailView({ product }: { product: Product }) {
  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">{product.title}</h1>
          <p className="text-gray-500 mt-2">ID: {product.id}</p>
        </div>
        <Button asChild size="lg">
          <Link href={`/admin/product/${product.id}/EditProduct`}>
            編輯商品
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          {product.img ? (
            <Image
              src={product.img}
              alt={product.title || ""}
              width={600}
              height={600}
              className="rounded-xl shadow-lg object-cover"
            />
          ) : (
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-96 flex items-center justify-center">
              <span className="text-gray-500 text-xl">無圖片</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">商品資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-gray-500">價格</p>
                <p className="text-3xl font-bold text-primary">NT${product.price}</p>
              </div>
              {product.des && (
                <div>
                  <p className="text-sm text-gray-500">描述</p>
                  <p className="text-lg leading-relaxed">{product.des}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">單位</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {product.unit?.length ? (
                    product.unit.map((s) => (
                      <span key={s} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">未設定</span>
                  )}
                </div>
              </div>
              {product.category && (
                <div>
                  <p className="text-sm text-gray-500">分類</p>
                  <p className="text-lg font-medium">{product.category.category}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}