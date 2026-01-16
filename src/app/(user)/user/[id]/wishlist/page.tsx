"use client";

import useSWR, { useSWRConfig } from "swr";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Heart, Trash2} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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

export default function WishlistPage() {
  const { status } = useSession(); // ← 僅取 status，避免 unused 警告
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const {
    data: wishlist = [],
    isLoading,
    error,
  } = useSWR<Product[]>("/api/wishlist", fetcher, {
    revalidateOnFocus: false,
  });

  // 登入狀態處理
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  // 移除願望清單項目
  const removeFromWishlist = async (productId: string) => {
    const optimisticWishlist = wishlist.filter((p) => p.id !== productId);

    mutate("/api/wishlist", optimisticWishlist, { revalidate: false });

    try {
      const res = await fetch("/api/wishlist/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) throw new Error("移除失敗");
      toast.success("已從願望清單移除");
      mutate("/api/wishlist");
    } catch {
      toast.error("移除失敗，請再試一次");
      mutate("/api/wishlist");
    }
  };

  // 加入購物車
  // const addToCart = async (product: Product) => {
  //   if (product.unit.length === 0) {
  //     toast.error("此商品無可用單位");
  //     return;
  //   }

  //   const selectedUnit = product.unit[0];

  //   try {
  //     const res = await fetch("/api/cart/add", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         productId: product.id,
  //         unit: selectedUnit,
  //         quantity: 1,
  //       }),
  //     });

  //     if (!res.ok) throw new Error("加入失敗");
  //     toast.success(`已加入購物車（${selectedUnit}）`);
  //     // 可選：成功後自動移除願望清單
  //     // await removeFromWishlist(product.id);
  //   } catch {
  //     toast.error("加入購物車失敗");
  //   }
  // };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24">
        <p className="text-xl text-red-600">載入願望清單失敗，請刷新頁面</p>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Heart className="h-24 w-24 text-gray-300 mx-auto mb-8" />
        <h1 className="text-3xl font-bold mb-4">您的願望清單目前為空</h1>
        <p className="text-gray-600 mb-8">
          瀏覽商品時，點擊愛心圖示即可將商品加入願望清單
        </p>
        <Button asChild>
          <Link href="/shop">去逛逛商品</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">我的願望清單</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {wishlist.map((product) => (
          <Card
            key={product.id}
            className="overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col"
          >
            <Link href={`/shop/${product.id}`} className="block relative aspect-square bg-gray-100">
              {product.img ? (
                <Image
                  src={product.img}
                  alt={product.title || "商品圖片"}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200">
                  無圖片
                </div>
              )}
            </Link>

            <CardHeader className="pb-3">
              <CardTitle className="text-lg line-clamp-2">
                {product.title || "無標題商品"}
              </CardTitle>
            </CardHeader>

<CardContent className="flex-1 flex flex-col justify-between">
  <div className="space-y-3">
    <p className="text-2xl font-bold text-primary">
      ${product.price || "0"}
    </p>

    {/* 單位顯示 - 加上防護 */}
    {product.unit?.length > 0 && (
      <p className="text-sm text-gray-600">
        單位：{product.unit.join(" / ")}
      </p>
    )}

    {product.category && (
      <Badge variant="secondary" className="w-fit">
        {product.category.category}
      </Badge>
    )}

    {/* 材質標籤 - 修正為 materials */}
    {product.materials?.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {product.materials.map((material) => (
          <Badge 
            key={material.id} 
            variant="outline" 
            className="text-xs"
          >
            {material.materials}
          </Badge>
        ))}
      </div>
    )}
  </div>

  <div className="flex gap-2 mt-6">
    {/* <Button className="flex-1" onClick={() => addToCart(product)}>
      <ShoppingCart className="mr-2 h-4 w-4" />
      加入購物車
    </Button> */}

    <Button
      variant="outline"
      size="icon"
      onClick={() => removeFromWishlist(product.id)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}