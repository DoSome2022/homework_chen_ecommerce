// src/app/(user)/user/[userId]/order/[orderId]/page.tsx

import { redirect } from "next/navigation";
import { auth } from "../../../../../../../auth";
import OrderDetail from "../components/orderDatail";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise< { id: string; orderId: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }

  const { id , orderId } = await params;

  return <OrderDetail userId={id} orderId={orderId} />;
}