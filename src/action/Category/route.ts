// src/action/Category/route.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";



// 定義正確的回傳型別（解決 any）
type FormState = {
  error?: string;
  success?: string;
};

const categoriesSchema = z.object({
  categories: z
    .string()
    .min(1, "請至少輸入一個類型")
    .transform((val) =>
      val
        .split(/[\s,\n]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    ),
});

export async function createCategoriesAction(
  prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const parsed = categoriesSchema.safeParse({
    categories: formData.get("categories"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] || "請輸入類型" };
  }

  const category = parsed.data.categories;

  try {
    await db.category.createMany({
      data: category.map((category) => ({ category })),
      skipDuplicates: true,
    });

    revalidatePath("/admin/category");
    return { success: "單位類型成功！" };
  } catch (err) {
    // 解決 "error is defined but never used"
    console.error("類型建立失敗:", err);
    return { error: "建立失敗，可能有重複類型" };
  }
}


// src/action/Category/route.ts （加入編輯功能）

const categoryNameSchema = z.object({
  category: z.string().min(1, "請輸入類別名稱").trim(),
});

export async function updateCategoryAction(
  id: string,
  category: string
): Promise<ActionResult> {
  const parsed = categoryNameSchema.safeParse({ category });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] || "請輸入類別名稱" };
  }

  try {
    // 與 create 保持一致，統一轉成大寫
    await db.category.update({
      where: { id },
      data: { category: parsed.data.category.toUpperCase() },
    });

    revalidatePath("/admin/category");
    revalidatePath("/api/category");

    return { success: true };
  } catch (err) {
    console.error("更新類別失敗:", err);
    return { error: "更新失敗，可能類別名稱重複" };
  }
}


// src/action/Category/route.ts（加上刪除功能）





// 定義正確的回傳型別
type ActionResult = 
  | { success: true }
  | { error: string };

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    await db.category.delete({
      where: { id },
    });
    revalidatePath("/admin/category");
    revalidatePath("/api/category");
    return { success: true };
  } catch (err) {
    console.error("刪除類型失敗:", err);
    return { error: "刪除失敗，可能已被商品使用" };
  }
}