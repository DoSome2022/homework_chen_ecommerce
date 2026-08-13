// src/app/(admin)/admin/categories/componants/CategoryLists.tsx

"use client";

import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  deleteCategoryAction,
  updateCategoryAction,
} from "@/action/Category/route";

// 定義正確型別（解決所有 any！）
type Category = {
  id: string;
  category: string;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CategoryLists() {
  const { data: categories = [], error, isLoading, mutate } = useSWR<Category[]>("/api/category", fetcher);

  // 編輯狀態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這個類別嗎？")) return;

    // 樂觀更新
    mutate(
      (current) => current?.filter((s) => s.id !== id),
      false
    );

    const result = await deleteCategoryAction(id);

    if ("error" in result) {
      alert(result.error);
      mutate(); // 失敗就重新抓
    }
  };

  // 開始編輯
  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingValue(category.category);
  };

  // 取消編輯
  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  // 儲存編輯
  const saveEdit = async () => {
    if (!editingId || !editingValue.trim()) return;

    setIsUpdating(true);
    const result = await updateCategoryAction(editingId, editingValue.trim());
    setIsUpdating(false);

    if ("error" in result) {
      alert(result.error);
      return;
    }

    // 本地樂觀更新
    mutate(
      (current) =>
        current?.map((s) =>
          s.id === editingId ? { ...s, category: editingValue.trim() } : s
        ),
      false
    );

    cancelEdit();
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

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-500 mb-4">還沒有建立任何類別</p>
        <Button asChild>
          <Link href="/admin/categories/CreateCategory">建立第一個類別</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">類別管理</h1>
        <Button asChild>
          <Link href="/admin/categories/CreateCategory">新增類別</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Card
            key={category.id}
            className="relative group hover:shadow-lg transition-shadow"
          >
            {editingId === category.id ? (
              // 編輯模式
              <CardContent className="pt-6 space-y-2">
                <Input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={saveEdit}
                    disabled={isUpdating || !editingValue.trim()}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    儲存
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4" />
                    取消
                  </Button>
                </div>
              </CardContent>
            ) : (
              // 顯示模式
              <>
                <CardHeader className="pb-3">
                  <CardTitle className="text-center text-3xl font-bold">
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="flex-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
