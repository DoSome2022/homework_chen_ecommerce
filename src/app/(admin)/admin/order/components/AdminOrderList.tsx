// src/app/(admin)/admin/orders/components/AdminOrderList.tsx
"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2 } from "lucide-react"; // 新增 Trash2 icon
import { toast } from "sonner";
import Link from "next/link";
import { deleteOrderAction } from "@/action/Order/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Order = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null };
  returnRequest?: { status: string } | null;
};

export default function AdminOrderList() {
  const { data: orders = [], isLoading, mutate } = useSWR<Order[]>("/api/admin/orders", fetcher);

  const handleDelete = async (orderId: string, orderNumber: string) => {
    if (!confirm(`確定要刪除訂單 ${orderNumber}？此操作無法復原！`)) {
      return;
    }

    const result = await deleteOrderAction(orderId);

    if (result.success) {
      toast.success(result.message);
      mutate(); // 重新載入列表
    } else {
      toast.error(result.error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">訂單管理</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <Card key={order.id} className={order.returnRequest?.status === "PENDING" ? "border-red-300 border-2" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <CardTitle>
                    訂單 {order.orderNumber} - {order.user.name || "未知用戶"}
                  </CardTitle>
                  <p className="text-gray-600">
                    {format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  {/* 狀態 Badge */}
                  <Badge variant={order.status === "pending" ? "secondary" : "default"}>
                    {order.status === "pending" ? "待處理" : "已完成"}
                  </Badge>
                  <p className="text-2xl font-bold text-primary">
                    ${order.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button asChild>
                <Link href={`/admin/order/${order.id}`}>查看詳情</Link>
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleDelete(order.id, order.orderNumber)}
                title="刪除訂單"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}