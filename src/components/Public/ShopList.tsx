"use client";

import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { Search, Loader2, X, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useSWRConfig } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Category = { id: string; category: string };
type Material = { id: string; materials: string };

type Product = {
  id: string;
  title: string | null;
  price: string | null;
  img: string | null;
  unit: string[];
  category: Category | null;
  materials: Material[];
};



export default function ShopProductListsPublic() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 修正 wishlist 的資料處理
//   const { data: wishlistData = [], error: wishlistError } = useSWR("/api/wishlist", fetcher);

const { data: wishlistData = [] } = useSWR<Product[]>("/api/wishlist", fetcher);
  // 確保 wishlist 是陣列
  const wishlist = Array.isArray(wishlistData) ? wishlistData : [];
  const wishlistIds = new Set(wishlist.map((p) => p.id));
  
  const { mutate } = useSWRConfig();

  const toggleWishlist = async (productId: string) => {
    const isAdding = !wishlistIds.has(productId);

    mutate(
      "/api/wishlist",
      async () => {
        if (isAdding) {
          await fetch("/api/wishlist/add", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ productId }),
          });
        } else {
          await fetch("/api/wishlist/remove", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ productId }),
          });
        }
        const res = await fetch("/api/wishlist");
        return res.json();
      },
      {
        optimisticData: isAdding
          ? [...wishlist, products.find((p) => p.id === productId)!]
          : wishlist.filter((p) => p.id !== productId),
        rollbackOnError: true,
        revalidate: true,
      }
    );

    mutate("/api/products");
  };

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get("category") || null
  );
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(
    searchParams.get("materials")?.split(",").filter(Boolean) || []
  );

  const { data: productsData = [], isLoading } = useSWR("/api/products", fetcher);
  
  // 確保 products 是陣列
  const products = Array.isArray(productsData) ? productsData : [];

  const categories = products
    .map((p) => p.category)
    .filter((c): c is Category => c !== null)
    .filter((c, i, arr) => arr.findIndex((t) => t.id === c.id) === i);

  const materials = products
    .flatMap((p) => p.materials)
    .filter((m, i, arr) => arr.findIndex((t) => t.id === m.id) === i);

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase()) ?? true;
    const matchCategory = !selectedCategory || p.category?.id === selectedCategory;
const matchMaterial =
  selectedMaterials.length === 0 ||
  p.materials.some((m: Material) => selectedMaterials.includes(m.id));
    return matchSearch && matchCategory && matchMaterial;
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedMaterials.length > 0) params.set("materials", selectedMaterials.join(","));
    router.push(`?${params.toString()}`, { scroll: false });
  }, [search, selectedCategory, selectedMaterials, router]);

  const clearFilter = (type: "category" | "material", value?: string) => {
    if (type === "category") setSelectedCategory(null);
    if (type === "material" && value) {
      setSelectedMaterials((prev) => prev.filter((id) => id !== value));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

<header className="sticky top-0 z-20 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* 左側可放品牌或標題（可選） */}
        <h2 className="text-xl font-semibold">您的商店</h2>
        
        {/* 右上登入/註冊按鈕 */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">登入</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">註冊</Link>
          </Button>
        </div>
      </div>
    </header>




        {/* 搜尋欄 */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="搜尋商品名稱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* 側邊欄：分類 + 材質篩選 */}
          <div className="lg:col-span-1">
            <div className="space-y-8">
              {/* 分類 */}
              <div>
                <h3 className="font-semibold mb-4">商品分類</h3>
                <div className="space-y-2">
                  <Button
                    variant={selectedCategory ? "outline" : "default"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(null)}
                  >
                    全部商品
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 材質 */}
              <div>
                <h3 className="font-semibold mb-4">材質</h3>
                <div className="space-y-2">
                  {materials.map((m) => (
                    <Button
                      key={m.id}
                      variant={selectedMaterials.includes(m.id) ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedMaterials((prev) =>
                          prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        );
                      }}
                    >
                      {m.materials}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 目前篩選條件 */}
              {(selectedCategory || selectedMaterials.length > 0) && (
                <div>
                  <h3 className="font-semibold mb-4">已選條件</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategory && (
                      <Badge variant="secondary">
                        {categories.find((c) => c.id === selectedCategory)?.category}
                        <X
                          className="ml-2 h-3 w-3 cursor-pointer"
                          onClick={() => clearFilter("category")}
                        />
                      </Badge>
                    )}
                    {selectedMaterials.map((id) => {
                      const m = materials.find((m) => m.id === id);
                      return m ? (
                        <Badge key={id} variant="secondary">
                          {m.materials}
                          <X
                            className="ml-2 h-3 w-3 cursor-pointer"
                            onClick={() => clearFilter("material", id)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 主內容：商品格線 */}
          <div className="lg:col-span-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-xl text-gray-500">找不到符合條件的商品</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts.map((product) => (
                  <Link
                    href={`/`}
                    key={product.id}
                    className="group relative" // 加入 relative 供絕對定位使用
                  >
                    {/* Hover 提示框 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <div className="bg-black/75 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
                        請登入才可以買
                      </div>
                    </div>

                    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                      <div className="aspect-square relative bg-gray-100">
                        {product.img ? (
                          <Image
                            src={product.img}
                            alt={product.title || "商品圖片"}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200">
                            無圖片
                          </div>
                        )}
                      </div>

                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                          {product.title || "無標題商品"}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <p className="text-2xl font-bold text-primary">
                            ${product.price || "0"}
                          </p>

                          {product.unit.length > 0 && (
                            <p className="text-sm text-gray-600">
                              單位：{product.unit.join(" / ")}
                            </p>
                          )}

                          {product.category && (
                            <Badge variant="secondary" className="w-fit">
                              {product.category.category}
                            </Badge>
                          )}

                            {product.materials.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {product.materials.map((m: Material) => (
                                <Badge key={m.id} variant="outline" className="text-xs">
                                    {m.materials}
                                </Badge>
                                ))}
                            </div>
                            )}
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          className="mt-4"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleWishlist(product.id);
                          }}
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              wishlistIds.has(product.id) ? "fill-red-500 text-red-500" : ""
                            }`}
                          />
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    
  );
}