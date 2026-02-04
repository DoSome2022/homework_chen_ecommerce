// src/app/(user)/user/[userId]/order/page.tsx
"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Order = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  shippingName: string;
};

export default function OrderLists() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  

  const { data: orders = [], isLoading } = useSWR<Order[]>(
    userId ? `/api/user/${userId}/orders` : null,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    
    return (
      <div className="text-center py-24">
        <h2 className="text-3xl font-bold mb-4">還沒有訂單</h2>
        <Button asChild>
          <Link href={`/user/${userId}/shop`}>去購物</Link>
        </Button>
      </div>
    );
  }

  const statusColor = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    shipped: "bg-blue-100 text-blue-800",
    completed: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="max-w-6xl mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">我的訂單</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">訂單 {order.orderNumber}</CardTitle>
                  <p className="text-gray-600 mt-2">
                    下單時間：{format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
                <Badge className={statusColor[order.status as keyof typeof statusColor] || "bg-gray-100"}>
                  {order.status === "pending" ? "待付款" :
                   order.status === "paid" ? "已付款" :
                   order.status === "shipped" ? "已出貨" : "已完成"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p>收件人：{order.shippingName}</p>
                  <p className="text-2xl font-bold text-primary mt-4">
                    ${order.total.toLocaleString()}
                  </p>
                </div>
                <Button asChild>
                  <Link href={`/user/${userId}/order/${order.id}`}>
                    查看詳情
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}