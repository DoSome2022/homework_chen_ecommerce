// src/app/(admin)/admin/product/components/CreateProductForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import useSWR from "swr";
import { createProductAction, FormState } from "@/action/Product/route";
import { Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Unit = {
  id: string;
  unit: string;
};
type Category = {
  id: string;
  category: string;
};
type Material = {
  id: string;
  materials: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 完全避開 File、FileList、Blob 等瀏覽器專屬物件
const productSchema = z.object({
  title: z.string().min(1, "商品名稱是必填的"),
  des: z.string().optional(),
  unit: z.array(z.string()).min(1, "至少選擇一個單位"),
  price: z.string().min(1, "價格是必填的"),
  categoryId: z.string().optional(),
  materialIds: z.array(z.string()).min(1, "請至少選擇一個材質"),

  // 終極解法：只用通用型別 + 運行時檢查
  img: z.any()
    .refine((val) => {
      // SSR 階段直接放行
      if (typeof window === "undefined") return true;
      // 瀏覽器階段才檢查
      if (!val) return false;
      if (val instanceof FileList) return val.length > 0 && val[0].size > 0;
      if (val instanceof File) return val.size > 0;
      return false;
    }, "請選擇有效的商品圖片")
    .refine((val) => {
      if (typeof window === "undefined") return true;
      const file = val instanceof FileList ? val[0] : val;
      return file && file.size <= 10 * 1024 * 1024;
    }, "圖片請小於 10MB")
    // 最後轉成 File 物件給後端用
    .transform((val) => (val instanceof FileList ? val[0] : val)),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function CreateProductForm() {
  const { data: units = [] } = useSWR<Unit[]>("/api/units", fetcher);
  const { data: categories = [] } = useSWR<Category[]>("/api/category", fetcher);
  const { data: materials = [] } = useSWR<Material[]>("/api/materials", fetcher);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      des: "",
      price: "",
      unit: [],
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewImg(URL.createObjectURL(file));
    }
  };

// 在 CreateProductForm.tsx 中添加
const onSubmit = async (data: ProductFormData) => {
  setIsSubmitting(true);
  setFormError(null);
  setFormSuccess(null);

  try {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("des", data.des || "");
    formData.append("price", data.price);
    
    data.unit.forEach(u => formData.append("unit", u));
    data.materialIds.forEach(id => formData.append("materialId", id));
    
    if (data.categoryId && data.categoryId !== "none" && data.categoryId !== "") {
      formData.append("categoryId", data.categoryId);
    }
    
    formData.append("img", data.img as File);

    const result = await createProductAction(formData) as FormState;

    // 檢查是否存在 success 屬性
    if (result && 'success' in result && result.success) {
      setFormSuccess(result.success);
      setTimeout(() => router.push("/admin/product"), 2000);
    } 
    // 檢查是否存在 error 屬性
    else if (result && 'error' in result && result.error) {
      setFormError(result.error);
    }
    // 都沒有
    else {
      setFormError("未知的伺服器回應");
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "未知錯誤";
    setFormError("建立商品時發生錯誤: " + message);
  } finally {
    setIsSubmitting(false);
  }
};
 

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">新增商品</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左側：表單 */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">商品名稱</Label>
              <Input 
                id="title" 
                {...register("title")} 
                disabled={isSubmitting} 
                placeholder="輸入商品名稱"
              />
          {errors.title?.message && (
            <p className="text-red-600 text-sm mt-1">{errors.title.message.toString()}</p>
          )}
            </div>

            <div>
              <Label htmlFor="des">描述（選填）</Label>
              <Textarea 
                id="des" 
                {...register("des")} 
                rows={4} 
                disabled={isSubmitting} 
                placeholder="輸入商品描述"
              />
            </div>

            <div>
              <Label htmlFor="price">價格</Label>
              <Input 
                id="price" 
                type="number" 
                {...register("price")} 
                disabled={isSubmitting} 
                placeholder="輸入商品價格"
              />
              {errors.price?.message && (
                <p className="text-red-600 text-sm mt-1">{errors.price.message.toString()}</p>
              )}
            </div>

            <div>
              <Label>單位（多選）</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                {units.map((s) => (
                  <div key={s.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`unit-${s.id}`}
                      checked={watch("unit")?.includes(s.unit)}
                      onCheckedChange={(checked) => {
                        const current = watch("unit") || [];
                        if (checked) {
                          setValue("unit", [...current, s.unit]);
                        } else {
                          setValue("unit", current.filter((v: string) => v !== s.unit));
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <label 
                      htmlFor={`unit-${s.id}`} 
                      className="text-sm cursor-pointer select-none"
                    >
                      {s.unit}
                    </label>
                  </div>
                ))}
              </div>
                {errors.unit?.message && (
                  <p className="text-red-600 text-sm mt-1">{errors.unit.message.toString()}</p>
                )}
            </div>
<div>
<div>
  <Label>商品分類</Label>
  <Select
    value={watch("categoryId") || ""}
    onValueChange={(value) => {
      setValue("categoryId", value === "none" ? undefined : value, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }}
    disabled={isSubmitting}
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

  {/* 關鍵：一定要註冊！ */}
  <input
    type="hidden"
    {...register("categoryId")}
    value={watch("categoryId") === "none" ? "" : watch("categoryId") || ""}
  />
</div>

  {/* 送出時，如果是 "none" 就送空字串 */}
  <input
    type="hidden"
    name="categoryId"
    value={watch("categoryId") === "none" ? "" : watch("categoryId") || ""}
  />
</div>
<div>
  <Label>材質（多選）</Label>
  <div className="grid grid-cols-3 gap-4 mt-2">
    {materials.map((m) => (
      <div key={m.id} className="flex items-center space-x-2">
        <Checkbox
          checked={watch("materialIds")?.includes(m.id)}
          onCheckedChange={(checked) => {
            const current = watch("materialIds") || [];
            if (checked) {
              setValue("materialIds", [...current, m.id]);
            } else {
              setValue("materialIds", current.filter((v) => v !== m.id));
            }
          }}
        />
        <label className="text-sm">{m.materials}</label>
      </div>
    ))}
    {errors.materialIds?.message && (
  <p className="text-red-600 text-sm mt-1">{errors.materialIds.message.toString()}</p>
)}
  </div>
</div>
            <div>
              <Label htmlFor="img">商品圖片</Label>
              <Input
                id="img"
                type="file"
                accept="image/*"
                disabled={isSubmitting}
                {...register("img")}
                onChange={(e) => {
                  register("img").onChange(e);
                  handleImageChange(e);
                }}
              />
                {errors.img?.message && (
                  <p className="text-red-600 text-sm mt-1">{errors.img.message.toString()}</p>
                )}
            </div>
          </div>

          {/* 右側：圖片預覽 */}
          <div>
            <Label>圖片預覽</Label>
            <div className="mt-2 border-2 border-dashed rounded-xl p-8 text-center bg-gray-50 min-h-[300px] flex items-center justify-center">
              {previewImg ? (
                <div className="relative">
                  <Image
                    src={previewImg}
                    alt="商品預覽"
                    width={400}
                    height={400}
                    className="mx-auto rounded-lg object-cover max-h-[300px]"
                  />
                </div>
              ) : (
                <div className="text-gray-400">
                  <Upload className="mx-auto h-12 w-12 mb-4" />
                  <p>選擇圖片後會顯示預覽</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 表單狀態訊息 */}
        {formError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">{formError}</p>
          </div>
        )}

        {formSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium">{formSuccess}</p>
          </div>
        )}

        <Button 
          type="submit" 
          size="lg" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              建立中...
            </>
          ) : (
            "建立商品"
          )}
        </Button>
      </form>
    </div>
  );
}