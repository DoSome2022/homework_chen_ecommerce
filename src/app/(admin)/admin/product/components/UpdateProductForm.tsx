// src/app/(admin)/admin/product/components/UpdateProductForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import useSWR from "swr";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import Link from "next/link";
import { updateProductAction } from "@/action/Product/route";
import { Loader2 } from "lucide-react";

// 型別定義（從資料庫來的）
type Category = { id: string; category: string };
type Unit = { id: string; unit: string };
type Material = { id: string; materials: string };

type Product = {
  id: string;
  title: string | null;
  des: string | null;
  price: string | null;
  img: string | null;
  unit: string[];
  categoryId: string | null;
  materialIds: string[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const schema = z.object({
  title: z.string().min(1, "商品名稱必填"),
  des: z.string().optional(),
  price: z.string().min(1, "價格必填"),
  unit: z.array(z.string()).min(1, "至少選擇一個單位"),
  categoryId: z.string().optional(),
  materialIds: z.array(z.string()).min(1, "請至少選擇一個材質"),
  img: z.any(),
});

export default function UpdateProductForm({ product }: { product: Product }) {
  const { data: categories = [] } = useSWR<Category[]>("/api/category", fetcher);
  const { data: units = [] } = useSWR<Unit[]>("/api/units", fetcher);           // 新增
  const { data: materials = [] } = useSWR<Material[]>("/api/materials", fetcher);

  const [state, formAction, isPending] = useActionState(
    updateProductAction.bind(null, product.id),
    undefined
  );

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: product.title ?? "",
      des: product.des ?? "",
      price: product.price ?? "",
      unit: product.unit ?? [],
      categoryId: product.categoryId ?? "",
      materialIds: product.materialIds ?? [],
    },
  });

  const newImageFile = watch("img")?.[0];
  const previewUrl = newImageFile
    ? URL.createObjectURL(newImageFile)
    : product.img || null;

  // 初始化材質（從資料庫載入後打勾）
  useEffect(() => {
    if (materials.length > 0 && product.materialIds.length > 0) {
      setValue("materialIds", product.materialIds);
    }
  }, [materials, product.materialIds, setValue]);

  // 清理預覽 URL
  useEffect(() => {
    return () => {
      if (newImageFile && previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [newImageFile, previewUrl]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">編輯商品</h1>

      <form action={formAction} className="space-y-10">
        <input type="hidden" name="existingImg" value={product.img || ""} />

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* 商品名稱、描述、價格（不變） */}
            <div>
              <Label htmlFor="title">商品名稱</Label>
              <Input id="title" {...register("title")} disabled={isPending} />
              {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <Label htmlFor="des">描述（選填）</Label>
              <Textarea id="des" {...register("des")} rows={4} disabled={isPending} />
            </div>

            <div>
              <Label htmlFor="price">價格</Label>
              <Input id="price" type="number" {...register("price")} disabled={isPending} />
              {errors.price && <p className="text-red-600 text-sm mt-1">{errors.price.message}</p>}
            </div>

            {/* 分類（動態） */}
            <div>
              <Label>商品分類</Label>
              <Select
                value={watch("categoryId") || ""}
                onValueChange={(v) => {
                  setValue("categoryId", v === "none" ? "" : v, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類（選填）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">無分類</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                {...register("categoryId")}
                value={watch("categoryId") === "none" ? "" : watch("categoryId") || ""}
              />
            </div>

            {/* 單位（動態從資料庫） */}
            <div>
              <Label>單位（多選）</Label>
              <div className="grid grid-cols-4 gap-3 mt-3">
                {units.map((u) => (
                  <div key={u.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={watch("unit")?.includes(u.unit)}
                      onCheckedChange={(checked) => {
                        const curr = watch("unit") ?? [];
                        setValue("unit", checked ? [...curr, u.unit] : curr.filter((v) => v !== u.unit));
                      }}
                      disabled={isPending}
                    />
                    <span className="text-sm">{u.unit}</span>
                  </div>
                ))}
              </div>
              {/* 送出單位 */}
              {watch("unit")?.map((u) => (
                <input key={u} type="hidden" name="unit" value={u} />
              ))}
              {errors.unit && <p className="text-red-600 text-sm mt-1">{errors.unit.message}</p>}
            </div>

            {/* 材質（動態從資料庫） */}
            <div>
              <Label>材質（多選）</Label>
              <div className="grid grid-cols-3 gap-4 mt-3">
                {materials.map((m) => (
                  <div key={m.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={watch("materialIds")?.includes(m.id)}
                      onCheckedChange={(checked) => {
                        const curr = watch("materialIds") ?? [];
                        setValue("materialIds", checked ? [...curr, m.id] : curr.filter((id) => id !== m.id));
                      }}
                      disabled={isPending}
                    />
                    <label className="text-sm cursor-pointer">{m.materials}</label>
                  </div>
                ))}
              </div>
              {/* 送出材質 */}
              {watch("materialIds")?.map((id) => (
                <input key={id} type="hidden" name="materialId" value={id} />
              ))}
              {errors.materialIds && <p className="text-red-600 text-sm mt-1">{errors.materialIds.message}</p>}
            </div>

            {/* 圖片 */}
            <div>
              <Label htmlFor="img">更換圖片（留空則保留原圖）</Label>
              <Input id="img" type="file" accept="image/*" {...register("img")} disabled={isPending} />
            </div>
          </div>

          {/* 右側預覽 */}
          <div>
            <Label>圖片預覽</Label>
            <div className="mt-2 border-2 border-dashed rounded-xl p-8 bg-gray-50 min-h-96 flex items-center justify-center">
              {previewUrl ? (
                <Image src={previewUrl} alt="預覽" width={500} height={500} className="max-h-96 rounded-lg object-contain" />
              ) : (
                <p className="text-gray-400">無圖片</p>
              )}
            </div>
          </div>
        </div>

        {/* 訊息 */}
        {state?.success && (
          <div className="p-4 bg-green-50 border border-green-300 rounded-lg text-green-700 font-medium">
            {state.success}
          </div>
        )}
        {state?.error && (
          <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-700">
            {state.error}
          </div>
        )}

        <div className="flex gap-4 pt-6">
          <Button type="submit" size="lg" className="flex-1" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                更新中...
              </>
            ) : (
              "更新商品"
            )}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/admin/product">返回列表</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}