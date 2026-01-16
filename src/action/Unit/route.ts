// src/action/Unit/route.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";



// 定義正確的回傳型別（解決 any）
type FormState = {
  error?: string;
  success?: string;
};

const unitsSchema = z.object({
  units: z
    .string()
    .min(1, "請至少輸入一個尺寸")
    .transform((val) =>
      val
        .split(/[\s,\n]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    ),
});

export async function createUnitsAction(
  prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const parsed = unitsSchema.safeParse({
    units: formData.get("units"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] || "請輸入單位" };
  }

  const units = parsed.data.units;

  try {
    await db.unit.createMany({
      data: units.map((unit) => ({ unit })),
      skipDuplicates: true,
    });

    revalidatePath("/admin/unit");
    return { success: "單位建立成功！" };
  } catch (err) {
    // 解決 "error is defined but never used"
    console.error("單位建立失敗:", err);
    return { error: "建立失敗，可能有重複單位" };
  }
}


// src/action/Unit/route.ts（加上刪除功能）


// src/action/Unit/route.ts


// 定義正確的回傳型別
type ActionResult = 
  | { success: true }
  | { error: string };

export async function deleteUnitAction(id: string): Promise<ActionResult> {
  try {
    await db.unit.delete({
      where: { id },
    });
    revalidatePath("/admin/unit");
    revalidatePath("/api/units");
    return { success: true };
  } catch (err) {
    console.error("刪除單位失敗:", err);
    return { error: "刪除失敗，可能已被商品使用" };
  }
}