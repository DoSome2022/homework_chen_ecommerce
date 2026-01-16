"use client";

import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Entry = {
  id: string;
  order: {
    orderNumber: string;
    shippingName: string;
    shippingPhone: string;
    createdAt: string;
    items: { title: string }[];
  };
  totalAmount: number;
  shippingFee: number;
  productAmount: number;
  settledAt: string;
};

export default function AccountList() {
  const [search, setSearch] = useState("");
  const { data: entries = [], isLoading } = useSWR<Entry[]>(
    `/api/admin/accountant?search=${search}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // 統計區塊（可自行擴充按月／季）
  const todayTotal = entries
    .filter((e) => format(new Date(e.settledAt), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"))
    .reduce((sum, e) => sum + e.totalAmount, 0);

  const monthTotal = entries
    .filter((e) => format(new Date(e.settledAt), "yyyy-MM") === format(new Date(), "yyyy-MM"))
    .reduce((sum, e) => sum + e.totalAmount, 0);

  return (
    <>
      <div className="flex flex-wrap gap-4 mb-8">
        <Input
          placeholder="搜尋訂單編號、姓名、電話、商品名稱..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-6 text-lg">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">今日入帳</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-green-600">
              ${todayTotal.toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">本月入帳</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-blue-600">
              ${monthTotal.toLocaleString()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 列表 */}
      {isLoading ? (
        <div className="text-center py-12">載入中...</div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-semibold">#{entry.order.orderNumber}</p>
                    <p>客戶：{entry.order.shippingName}（{entry.order.shippingPhone}）</p>
                    <p>商品：{entry.order.items.map(i => i.title).join("、")}</p>
                    <p className="text-sm text-muted-foreground">
                      訂單時間：{format(new Date(entry.order.createdAt), "PPP p")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${entry.totalAmount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      入帳時間：{format(new Date(entry.settledAt), "PPP p")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}