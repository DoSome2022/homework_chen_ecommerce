// "use server";

// import { db } from "@/lib/db";
// import { revalidatePath } from "next/cache";
// import OSS from "ali-oss";
// import type { Prisma } from "@prisma/client";

// const client = new OSS({
//   region: process.env.OSS_REGION!,
//   accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
//   accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
//   bucket: process.env.OSS_BUCKET!,
// });

// export type FormState = {
//   success?: string;
//   error?: string;
// };

// // 關鍵修正：正確的聯合型別
// // export type FormState = 
// //   | { success: string }
// //   | { error: string };


// export async function createProductAction(
//   formData: FormData
// ): Promise<FormState> {
//   try {
//     // 修正 1：用 const + for...of 避免 prefer-const 警告
//     console.log("接收到的 FormData:");
//     for (const [key, value] of formData.entries()) {
//       console.log(key, ":", value);
//     }

//     const file = formData.get("img");
//     if (!file || typeof file === "string" || (file instanceof File && file.size === 0)) {
//       return { error: "請上傳商品圖片" };
//     }

//     // 上傳圖片到 OSS
//     const buffer = Buffer.from(await file.arrayBuffer());
//     const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
//     const result = await client.put(filename, buffer);
//     const imgUrl = result.url;

//     // 獲取表單數據
//     const title = formData.get("title") as string;
//     const des = (formData.get("des") as string) || null;
//     const price = formData.get("price") as string;
//     const unit = formData.getAll("unit") as string[];
//     const materialIds = formData.getAll("materialId") as string[];
//     const categoryId = formData.get("categoryId") as string | null;

//     // 修正 2：用正確型別取代 any
//     const createData: Prisma.ProductCreateInput = {
//       title,
//       des,
//       price,
//       unit,
//       img: imgUrl,
//       materialIds,
//     };

//     // 處理分類關聯
//     if (categoryId && categoryId.trim() !== "" && categoryId !== "none") {
//       createData.category = { connect: { id: categoryId } };
//       console.log("設置分類關聯:", categoryId);
//     }

//     // 處理材質關聯
//     if (materialIds.length > 0) {
//       createData.materials = {
//         connect: materialIds.map((id) => ({ id })),
//       };
//     }

//     console.log("創建數據:", createData);

//     const savedata = await db.product.create({
//       data: createData,
//     });

//     console.log("保存結果:", savedata);

//     revalidatePath("/admin/product");
//     return { success: "商品建立成功！" };
//   } catch (error: unknown) {
//     // 修正 3：正確處理 error 型別
//     const message = error instanceof Error ? error.message : "未知錯誤";
//     console.error("建立商品失敗:", error);
//     return { error: `建立失敗: ${message}` };
//   }
// }

// // 刪除商品
// export async function deleteProductAction(id: string): Promise<FormState> {
//   try {
//     await db.product.delete({ where: { id } });
//     revalidatePath("/admin/product");
//     return { success: "商品已刪除" };
//   } catch (error: unknown) {
//     console.error("刪除商品失敗:", error);
//     return { error: "刪除失敗，商品可能已被使用" };
//   }
// }

// // 更新商品
// export async function updateProductAction(
//   id: string,
//   _prevState: FormState | undefined,
//   formData: FormData
// ): Promise<FormState> {
//   try {
//     const file = formData.get("img") as File | null;

//     let imgUrl = formData.get("existingImg") as string;

//     if (file && file.size > 0) {
//       const buffer = Buffer.from(await file.arrayBuffer());
//       const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
//       const result = await client.put(filename, buffer);
//       imgUrl = result.url;
//     }

//     const categoryId = formData.get("categoryId") as string | null;
//     const materialIds = formData.getAll("materialId") as string[];

//     const updateData: Prisma.ProductUpdateInput = {
//       title: formData.get("title") as string,
//       des: (formData.get("des") as string) || null,
//       price: formData.get("price") as string,
//       unit: formData.getAll("unit") as string[],
//       img: imgUrl,
//       materialIds,
//       materials: {
//         set: [], // 斷開舊關聯
//         connect: materialIds.map((id) => ({ id })),
//       },
//     };

//     // 處理分類
//     if (categoryId && categoryId.trim() !== "" && categoryId !== "none") {
//       updateData.category = { connect: { id: categoryId } };
//     } else {
//       updateData.category = { disconnect: true };
//     }

//     await db.product.update({
//       where: { id },
//       data: updateData,
//     });

//     revalidatePath("/admin/product");
//     revalidatePath(`/admin/product/${id}`);
//     return { success: "商品更新成功！" };
//   } catch (error: unknown) {
//     console.error("更新商品失敗:", error);
//     return { error: "更新失敗，請再試一次" };
//   }
// }

// src/action/Product/route.ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import OSS from "ali-oss";
import type { Prisma } from "@prisma/client";

const client = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET!,
});

// 修改為可選屬性
export type FormState = {
  success?: string;
  error?: string;
};

export async function createProductAction(
  formData: FormData
): Promise<FormState> {
  try {
    console.log("接收到的 FormData:");
    for (const [key, value] of formData.entries()) {
      console.log(key, ":", value);
    }

    const file = formData.get("img");
    if (!file || typeof file === "string" || (file instanceof File && file.size === 0)) {
      return { error: "請上傳商品圖片" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const result = await client.put(filename, buffer);
    const imgUrl = result.url;

    const title = formData.get("title") as string;
    const des = (formData.get("des") as string) || null;
    const price = formData.get("price") as string;
    const unit = formData.getAll("unit") as string[];
    const materialIds = formData.getAll("materialId") as string[];
    const categoryId = formData.get("categoryId") as string | null;

    const createData: Prisma.ProductCreateInput = {
      title,
      des,
      price,
      unit,
      img: imgUrl,
      materialIds,
    };

    if (categoryId && categoryId.trim() !== "" && categoryId !== "none") {
      createData.category = { connect: { id: categoryId } };
    }

    if (materialIds.length > 0) {
      createData.materials = {
        connect: materialIds.map((id) => ({ id })),
      };
    }

    console.log("創建數據:", createData);

    await db.product.create({
      data: createData,
    });

    revalidatePath("/admin/product");
    return { success: "商品建立成功！" };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "未知錯誤";
    console.error("建立商品失敗:", error);
    return { error: `建立失敗: ${message}` };
  }
}

export async function deleteProductAction(id: string): Promise<FormState> {
  try {
    await db.product.delete({ where: { id } });
    revalidatePath("/admin/product");
    return { success: "商品已刪除" };
  } catch (error: unknown) {
    console.error("刪除商品失敗:", error);
    return { error: "刪除失敗，商品可能已被使用" };
  }
}

export async function updateProductAction(
  id: string,
  _prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  try {
    const file = formData.get("img") as File | null;

    let imgUrl = formData.get("existingImg") as string;

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const result = await client.put(filename, buffer);
      imgUrl = result.url;
    }

    const categoryId = formData.get("categoryId") as string | null;
    const materialIds = formData.getAll("materialId") as string[];

    const updateData: Prisma.ProductUpdateInput = {
      title: formData.get("title") as string,
      des: (formData.get("des") as string) || null,
      price: formData.get("price") as string,
      unit: formData.getAll("unit") as string[],
      img: imgUrl,
      materialIds,
      materials: {
        set: [],
        connect: materialIds.map((id) => ({ id })),
      },
    };

    if (categoryId && categoryId.trim() !== "" && categoryId !== "none") {
      updateData.category = { connect: { id: categoryId } };
    } else {
      updateData.category = { disconnect: true };
    }

    await db.product.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/product");
    revalidatePath(`/admin/product/${id}`);
    return { success: "商品更新成功！" };
  } catch (error: unknown) {
    console.error("更新商品失敗:", error);
    return { error: "更新失敗，請再試一次" };
  }
}