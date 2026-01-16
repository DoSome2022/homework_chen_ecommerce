"use client";

import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, Edit, Search, Loader2, ArrowUpDown, Calendar } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { deleteProductAction } from "@/action/Product/route";
import { QRCodeSVG } from "qrcode.react"; // 新增：QR Code 元件
import { format } from "date-fns"; // 可選：美化日期格式（需安裝 date-fns）

// 若未安裝 date-fns，可執行：npm install date-fns

type Category = {
  id: string;
  category: string;
};

type Material = {
  id: string;
  materials: string;
};

type Product = {
  id: string;
  title: string | null;
  price: string | null;
  img: string | null;
  unit: string[];
  des?: string | null;
  category: Category | null;
  materials: Material[];
  arrivalDate: string | null; // 新增：ISO 字串或 null
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

type SortOrder = "none" | "desc" | "asc";

export default function ProductListPage() {
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");

  const { data: products = [], mutate, isLoading } = useSWR<Product[]>("/api/products", fetcher);

  const searchedProducts = products.filter((p) =>
    p.title?.toLowerCase().includes(search.toLowerCase())
  );

  const sortedProducts = [...searchedProducts].sort((a, b) => {
    if (sortOrder === "none") return 0;
    const priceA = parseFloat(a.price || "0") || 0;
    const priceB = parseFloat(b.price || "0") || 0;
    return sortOrder === "desc" ? priceB - priceA : priceA - priceB;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這個商品嗎？")) return;

    mutate(
      (current) => current?.filter((p) => p.id !== id),
      false
    );

    const result = await deleteProductAction(id);

    if (!("success" in result)) {
      alert(result.error || "刪除失敗");
      mutate();
    }
  };

  const toggleSort = () => {
    if (sortOrder === "none") setSortOrder("desc");
    else if (sortOrder === "desc") setSortOrder("asc");
    else setSortOrder("none");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">商品管理</h1>
        <Button asChild>
          <Link href="/admin/product/CreateProduct">新增商品</Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜尋商品名稱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button variant="outline" onClick={toggleSort} className="w-full sm:w-auto">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          價格排序
          {sortOrder === "desc" && "（由高到低）"}
          {sortOrder === "asc" && "（由低到高）"}
          {sortOrder === "none" && "（未排序）"}
        </Button>
      </div>

      {sortOrder !== "none" && (
        <p className="text-sm text-gray-600 mb-4">
          已按價格{sortOrder === "desc" ? "由高到低" : "由低到高"}排序
          <Button variant="link" size="sm" onClick={() => setSortOrder("none")} className="ml-2 px-0">
            清除排序
          </Button>
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedProducts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-xl text-gray-500">
              {search ? "找不到符合搜尋條件的商品" : "目前沒有商品"}
            </p>
          </div>
        ) : (
          sortedProducts.map((product) => {
            // QR Code 指向前台商品頁面（請根據您的路由調整）
            const productUrl = `${window.location.origin}/shop/${product.id}`;

            return (
              <Card key={product.id} className="overflow-hidden group">
                <div className="aspect-square relative bg-gray-100">
                  {product.img ? (
                    <Image
                      src={product.img}
                      alt={product.title || "商品圖片"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      無圖片
                    </div>
                  )}
                </div>

                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">
                    {product.title || "無標題"}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-2xl font-bold text-primary">
                    NT${product.price || "0"}
                  </p>

                  <p className="text-sm text-gray-600">
                    單位：{product.unit?.join(", ") || "無"}
                  </p>

                  <p className="text-sm">
                    分類：
                    <span className="font-medium text-blue-600">
                      {product.category?.category || "無分類"}
                    </span>
                  </p>

                  {/* 新增：到貨日期顯示 */}
                  {product.arrivalDate ? (
                    <p className="text-sm flex items-center text-green-700">
                      <Calendar className="h-4 w-4 mr-1" />
                      到貨日期：{format(new Date(product.arrivalDate), "yyyy年MM月dd日")}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">尚未設定到貨日期</p>
                  )}

                  <div className="text-sm">
                    <span>材質：</span>
                    {product.materials && product.materials.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {product.materials.map((m) => (
                          <span
                            key={m.id}
                            className="inline-block px-2 py-1 bg-gray-100 rounded-full text-xs"
                          >
                            {m.materials}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500"> 無</span>
                    )}
                  </div>

                  {/* 新增：QR Code */}
                  <div className="flex justify-center py-3">
                    <QRCodeSVG
                      value={productUrl}
                      size={128}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-xs text-center text-gray-500">掃描查看商品詳情</p>

                  <div className="flex gap-2 pt-4">
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/admin/product/${product.id}`}>
                        <Edit className="h-4 w-4 mr-1" /> 編輯
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}