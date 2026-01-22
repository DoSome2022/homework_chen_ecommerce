"use client";

import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { deleteDiscountAction } from "@/action/Discount/route";

const fetcher = (url: string) => fetch(url).then(res => res.json());

type Discount = {
  id: string;
  name: string;
  type: "MEMBER" | "PICKUP" | "TIMELIMIT";
  value: number;
  isPercent: boolean;
  startAt: string;
  endAt: string | null;
  memberOnly: boolean;
  pickupOnly: boolean;
  minAmount: number | null;
  code: string | null;
};

export default function DiscountList() {
  const { data: discounts = [], isLoading, mutate } = useSWR<Discount[]>("/api/admin/discounts", fetcher);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」？`)) return;

    const result = await deleteDiscountAction(id);
    if (result.success) {
      toast.success("折扣已刪除");
      mutate();
    } else {
      toast.error(result.error);
    }
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">折扣管理</h1>
        <Button asChild>
          <Link href="/admin/discounts/new">
            <Plus className="mr-2 h-4 w-4" />
            新增折扣
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {discounts.map(d => (
          <Card key={d.id}>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle>{d.name}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge>{d.type === "MEMBER" ? "會員促銷" : d.type === "TIMELIMIT" ? "限時優惠" : "現金折扣"}</Badge>
                    <Badge variant={d.isPercent ? "default" : "secondary"}>
                      {d.isPercent ? `${d.value}%` : `$${d.value}`}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/discounts/${d.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(d.id, d.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>有效期間：<br/>{new Date(d.startAt).toLocaleDateString()} ~ {d.endAt ? new Date(d.endAt).toLocaleDateString() : "無期限"}</div>
                <div>最低消費：{d.minAmount ? `$${d.minAmount}` : "無限制"}</div>
                <div>適用條件：{d.memberOnly ? "會員專屬" : d.pickupOnly ? "門市自取" : "全站適用"}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}