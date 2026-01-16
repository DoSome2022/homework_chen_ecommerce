
// app/admin/product/[id]/page.tsx

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductDetailView from "../components/ProductDetailView";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  const product = await db.product.findUnique({
    where: { id : productId },
    include: { category: true },
  });

  if (!product) notFound();

  // 把資料傳給純 Client Component
  return <ProductDetailView product={product} />;
}