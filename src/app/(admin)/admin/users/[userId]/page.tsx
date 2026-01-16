// src/app/(admin)/admin/users/[userId]/page.tsx
'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type UserDetail = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
  Order: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    shippingMethod: string | null;
    shippingAddress: string;
  }>;
};

type SortKey = 'createdAt' | 'total';
type SortOrder = 'asc' | 'desc';

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const { data: user, isLoading } = useSWR<UserDetail>(`/api/admin/users/${userId}`, fetcher);

  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!user) {
    return <div className="text-center py-12 text-xl">用戶不存在</div>;
  }

  const sortedOrders = [...user.Order].sort((a, b) => {
    if (sortKey === 'createdAt') {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }
    return sortOrder === 'desc' ? b.total - a.total : a.total - b.total;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">用戶詳情：{user.username}</h1>

      <Card className="mb-8">
        <CardHeader><CardTitle>基本資訊</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p>ID：{user.id}</p>
          <p>姓名：{user.name || '無'}</p>
          <p>Email：{user.email || '無'}</p>
          <p>電話：{user.phone || '無'}</p>
          <p>角色：{user.role}</p>
          <p>建立時間：{new Date(user.createdAt).toLocaleString()}</p>
          <p>更新時間：{new Date(user.updatedAt).toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            訂單記錄
            <div className="space-x-2">
              <Button variant="outline" onClick={() => toggleSort('createdAt')}>
                <ArrowUpDown className="mr-2 h-4 w-4" /> 時間排序
              </Button>
              <Button variant="outline" onClick={() => toggleSort('total')}>
                <ArrowUpDown className="mr-2 h-4 w-4" /> 金額排序
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>訂單號</TableHead>
                <TableHead>總額</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>建立時間</TableHead>
                <TableHead>物流方式</TableHead>
                <TableHead>地址</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell>${order.total.toLocaleString()}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{order.shippingMethod || '無'}</TableCell>
                  <TableCell>{order.shippingAddress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {user.Order.length === 0 && <p className="text-center py-4 text-gray-500">無訂單記錄</p>}
        </CardContent>
      </Card>
    </div>
  );
}