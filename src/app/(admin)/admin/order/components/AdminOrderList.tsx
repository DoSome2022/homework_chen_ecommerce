// src/app/(admin)/admin/orders/components/AdminOrderList.tsx
"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 關鍵：定義正確的 Order 型別！
type Order = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
  };
};

export default function AdminOrderList() {
  const { data: orders = [], isLoading } = useSWR<Order[]>("/api/admin/orders", fetcher);

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
          <Card key={order.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>
                    訂單 {order.orderNumber} - {order.user.name || "未知用戶"}
                  </CardTitle>
                  <p className="text-gray-600">
                    {format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={order.status === "pending" ? "secondary" : "default"}>
                    {order.status === "pending" ? "待處理" : "已完成"}
                  </Badge>
                  <p className="text-2xl font-bold text-primary mt-2">
                    NT${order.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={`/admin/order/${order.id}`}>查看詳情</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}