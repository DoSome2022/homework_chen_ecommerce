// src/app/(admin)/admin/users/emails/components/EmailList.tsx
"use client";

import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

type UserEmail = {
  id: string;
  email: string | null;
  username: string;
  role: "ADMIN" | "USER";
  createdAt: string;
};

export default function EmailList() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useSWR<UserEmail[]>(
    "/api/admin/user/emails",
    fetcher,
    { revalidateOnFocus: false }
  );

  // 前端過濾
  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim() || !user.email) return true;
    return user.email.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  return (
    <div className="container mx-auto p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">用戶 Email 清單</h1>

        {/* 搜尋欄 */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜尋 Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            所有用戶 Email（共 {users.length} 筆）
            {searchQuery && <Badge variant="secondary" className="ml-3">篩選中</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? "無符合的 Email" : "目前沒有用戶 Email 資料"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium">使用者名稱</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">角色</th>
                    <th className="text-left p-3 font-medium">建立時間</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{user.username}</td>
                      <td className="p-3 font-mono">
                        {user.email || <span className="text-gray-400">無</span>}
                      </td>
                      <td className="p-3">
                        <Badge variant={user.role === "ADMIN" ? "destructive" : "default"}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleString("zh-TW")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}