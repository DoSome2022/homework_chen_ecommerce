// src/action/Material/route.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";



// 定義正確的回傳型別（解決 any）
type FormState = {
  error?: string;
  success?: string;
};

const MaterialSchema = z.object({
  materials: z
    .string()
    .min(1, "請至少輸入一個材料")
    .transform((val) =>
      val
        .split(/[\s,\n]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    ),
});

export async function createMaterialsAction(
  prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const parsed = MaterialSchema.safeParse({
    materials: formData.get("materials"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] || "請輸入材料" };
  }

  const materials = parsed.data.materials;

  try {
    await db.materials.createMany({
      data: materials.map((materials) => ({ materials })),
      skipDuplicates: true,
    });

    revalidatePath("/admin/material");
    return { success: "單位材料成功！" };
  } catch (err) {
    // 解決 "error is defined but never used"
    console.error("材料建立失敗:", err);
    return { error: "建立失敗，可能有重複材料" };
  }
}


// src/action/Unit/route.ts（加上刪除功能）


// src/action/Unit/route.ts


// 定義正確的回傳型別
type ActionResult = 
  | { success: true }
  | { error: string };

export async function deleteMaterialAction(id: string): Promise<ActionResult> {
  try {
    await db.materials.delete({
      where: { id },
    });
    revalidatePath("/admin/material");
    revalidatePath("/api/materials");
    return { success: true };
  } catch (err) {
    console.error("刪除材料失敗:", err);
    return { error: "刪除失敗，可能已被商品使用" };
  }
}