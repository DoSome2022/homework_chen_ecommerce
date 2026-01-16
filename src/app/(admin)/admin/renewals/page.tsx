// src/app/admin/renewals/page.tsx
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import RenewalListItem from "../components/admin/RenewalListItem";

export default async function AdminRenewalsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return <p>未授權訪問。</p>;
  }

  // Server Side 查詢待處理請求
  const pendingRequests = await db.renewalRequest.findMany({
    where: { status: "PENDING" },
    include: { 
      user: true 
      // 移除 tier: true，因為模型中已無此關聯
    },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">續訂/升級處理列表</h1>
      {pendingRequests.length === 0 ? (
        <p>無待處理申請。</p>
      ) : (
        <ul className="space-y-4">
          {pendingRequests.map((req) => (
            <RenewalListItem key={req.id} request={req} />
          ))}
        </ul>
      )}
    </div>
  );
}