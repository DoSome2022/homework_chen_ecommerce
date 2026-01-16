// src/components/UnitLists.tsx
"use client";

import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { deleteUnitAction } from "@/action/Unit/route";



// 定義正確型別（解決所有 any！）
type Unit = {
  id: string;
  unit: string;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function UnitLists() {
  const { data: units = [], error, isLoading, mutate } = useSWR<Unit[]>("/api/units", fetcher);

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這個單位嗎？")) return;

    // 樂觀更新
    mutate(
      (current) => current?.filter((s) => s.id !== id),
      false
    );

    const result = await deleteUnitAction(id);

if ("error" in result) {
      alert(result.error);
      mutate(); // 失敗就重新抓
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-600 py-12">載入失敗</div>;
  }

  if (units.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-500 mb-4">還沒有建立任何單位</p>
        <Button asChild>
          <Link href="/admin/unit/CreateUnit">建立第一個單位</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">單位管理</h1>
        <Button asChild>
          <Link href="/admin/unit/CreateUnit">新增單位</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {units.map((unit) => (
          <Card key={unit.id} className="relative group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-3xl font-bold">{unit.unit}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="destructive"
                size="icon"
                className="w-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(unit.id)}
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