// src/app/(admin)/admin/discounts/new/page.tsx
import { redirect } from "next/navigation";


import { auth } from "../../../../../../auth";
import DiscountForm from "../components/DiscountForm";

export default async function NewDiscountPage() {
  const session = await auth();

  // 權限檢查
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">新增折扣</h1>
      <DiscountForm />
    </div>
  );
}