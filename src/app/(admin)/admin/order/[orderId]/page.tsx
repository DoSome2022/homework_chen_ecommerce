// src/app/(admin)/admin/orders/[orderId]/page.tsx
import { redirect } from "next/navigation";


import { auth } from "../../../../../../auth";
import OrderDetailAdmin from "../components/OrderDetailAdmin";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise <{ orderId: string }>;
}) {

  const { orderId } = await params;

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return <OrderDetailAdmin orderId={orderId} />;
}