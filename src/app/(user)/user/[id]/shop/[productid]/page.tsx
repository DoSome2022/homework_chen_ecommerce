// src/app/(user)/user/[userId]/shop/[productId]/page.tsx

import { redirect } from "next/navigation";
import { auth } from "../../../../../../../auth";
import ProductDetail from "../components/ProductDetail";


export default async function ProductDetailPage({
  params,
}: {
  params: Promise <{ userId: string; productid: string }>;
}) {
const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }
    const { userId , productid } = await params;
  return <ProductDetail userId={userId} productId={productid} />;
}