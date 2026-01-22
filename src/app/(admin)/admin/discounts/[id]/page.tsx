// src/app/(admin)/admin/discounts/[id]/page.tsx
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "../../../../../../auth";
import DiscountForm from "../components/DiscountForm";

// Next.js 15：params 必須是 Promise
export default async function EditDiscountPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 必須等待解析 params
  const { id } = await params;
  
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const discount = await db.discount.findUnique({
    where: { id },
  });

  if (!discount) {
    return <div className="text-center py-12">折扣不存在</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">編輯折扣：{discount.name}</h1>
      <DiscountForm initialData={discount} />
    </div>
  );
}