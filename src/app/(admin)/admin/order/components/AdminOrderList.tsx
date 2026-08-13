// src/app/(admin)/admin/orders/components/AdminOrderList.tsx
"use client";

import useSWR from "swr";
import { format, isAfter } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, Eye, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { deleteOrderAction } from "@/action/Order/route";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// ✅ 訂單狀態對應函數
const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "待處理", variant: "secondary" },
    pending_payment: { label: "待付款", variant: "secondary" },
    paid: { label: "已付款", variant: "default" },
    processing: { label: "處理中", variant: "default" },
    shipped: { label: "已出貨", variant: "default" },
    completed: { label: "已完成", variant: "default" },
    cancelled: { label: "已取消", variant: "destructive" },
    return_requested: { label: "退貨申請中", variant: "destructive" },
    return_approved: { label: "退貨已批准", variant: "default" },
    return_rejected: { label: "退貨已拒絕", variant: "destructive" },
    return_refunded: { label: "已退款", variant: "outline" },
  };

  return statusMap[status] || { label: status, variant: "default" };
};

export default function AdminOrderList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // ✅ 獲取當前時間
  const now = useMemo(() => new Date(), []);
  
  const { data: orders = [], isLoading, mutate } = useSWR<Order[]>("/api/admin/orders", fetcher);

  // ✅ 過濾訂單：只顯示今天及之前的訂單（不顯示未來的）
  const filteredOrders = useMemo(() => {
    // 先按時間過濾
    const timeFiltered = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return !isAfter(createdAt, now);
    });
    
    // 再按搜尋條件過濾
    let searchFiltered = timeFiltered;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      searchFiltered = timeFiltered.filter((order) => {
        const orderNumber = order.orderNumber.toLowerCase();
        const userName = (order.user?.name || "").toLowerCase();
        return orderNumber.includes(searchLower) || userName.includes(searchLower);
      });
    }
    
    // 再按狀態過濾
    if (statusFilter !== 'all') {
      searchFiltered = searchFiltered.filter((order) => {
        if (statusFilter === 'has_return') {
          return order.returnRequest?.status === "PENDING";
        }
        return order.status === statusFilter;
      });
    }
    
    return searchFiltered;
  }, [orders, now, search, statusFilter]);

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
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold">訂單管理</h1>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            共 {filteredOrders.length} 筆訂單
          </Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            📅 截至 {format(now, "yyyy-MM-dd")}
          </Badge>
        </div>
      </div>

      {/* ✅ 搜尋和篩選 */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          placeholder="搜尋訂單編號、客戶名稱..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="全部狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="pending">待處理</SelectItem>
            <SelectItem value="paid">已付款</SelectItem>
            <SelectItem value="processing">處理中</SelectItem>
            <SelectItem value="shipped">已出貨</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
            <SelectItem value="has_return">退貨申請中</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-xl text-gray-500">
              {orders.length > 0 ? "沒有符合條件的訂單" : "目前沒有訂單"}
            </p>
            {orders.length > 0 && filteredOrders.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">
                💡 可能有一些訂單的日期在未來，已被自動過濾
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusBadge(order.status);
            const hasReturnRequest = order.returnRequest?.status === "PENDING";

            return (
              <Card 
                key={order.id} 
                className={`transition-all hover:shadow-lg ${
                  hasReturnRequest ? "border-red-400 border-2 bg-red-50/50" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          訂單 #{order.orderNumber}
                          {hasReturnRequest && (
                            <Badge variant="destructive" className="animate-pulse">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              退貨申請
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          客戶：{order.user.name || "未知用戶"}
                        </p>
                        <p className="text-sm text-gray-500">
                          下單時間：{format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge variant={statusInfo.variant} className="text-base px-4 py-1">
                        {statusInfo.label}
                      </Badge>
                      <p className="text-2xl font-bold text-primary">
                        ${order.total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Button asChild>
                    <Link href={`/admin/order/${order.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      查看詳情
                    </Link>
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
            );
          })}
        </div>
      )}
    </div>
  );
}