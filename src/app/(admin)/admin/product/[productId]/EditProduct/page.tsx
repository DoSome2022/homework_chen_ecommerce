// app/admin/product/[productId]/EditProduct/page.tsx

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import EditProductForm from "../../components/UpdateProductForm";
import { auth } from "../../../../../../../auth";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>; // ← 關鍵！用 Promise + 改名 productId
}) {
  const { productId } = await params; // ← 一定要 await！

  const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });

  if (!product) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">{product.title}</h1>
          <p className="text-gray-600 mt-2">ID: {product.id}</p>
        </div>

        <EditProductForm product={product} />
      </div>
    </div>
  );
}