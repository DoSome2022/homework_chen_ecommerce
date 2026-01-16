'use client';

import useSWR, { useSWRConfig } from 'swr';  // ← 新增 useSWRConfig
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createUserAction, updateUserAction, deleteUserAction } from '@/action/User/route';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type User = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
};

// 新增專用 schema（password 必填）
const createUserSchema = z.object({
  username: z.string().min(3, '使用者名稱至少 3 個字'),
  name: z.string().optional(),
  email: z.string().email('Email 格式錯誤').optional().or(z.literal('')),
  phone: z.string().regex(/^09\d{8}$/, '手機格式錯誤（09 開頭共 10 碼）').optional().or(z.literal('')),
  password: z.string().min(6, '密碼至少 6 個字'),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

// 編輯專用 schema（password 選填）
const editUserSchema = createUserSchema.partial().extend({
  password: z.string().min(6).optional().or(z.literal('')),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<'USER' | 'ADMIN' | ''>('');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { mutate: swrMutate } = useSWRConfig();  // ← 取得全域 mutate
  const currentKey = roleFilter ? `/api/admin/user?role=${roleFilter}` : '/api/admin/user';

  const { data: users = [], isLoading } = useSWR<User[]>(
    roleFilter ? `/api/admin/user?role=${roleFilter}` : '/api/admin/user',
    fetcher,
    { revalidateOnFocus: false }
  );

  // 新增表單（password 必填）
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  // 編輯表單（password 選填）
  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const refreshUsers = () => {
    // 重新驗證目前 key 以及「全部用戶」的 key
    swrMutate(currentKey);
    swrMutate('/api/admin/users'); // 確保不論篩選狀態都更新
  };

  const onCreateSubmit = async (data: CreateUserFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const result = await createUserAction(formData);
    if (result.success) {
      toast.success(result.message || '用戶新增成功');
      createForm.reset();
      setOpenCreate(false);
      refreshUsers();  // ← 正確重新載入
    } else {
      toast.error(result.error || '新增失敗');
    }
  };

  const onEditSubmit = async (data: EditUserFormData) => {
    if (!editingUser) return;

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    const result = await updateUserAction(editingUser.id, formData);
    if (result.success) {
      toast.success(result.message || '用戶更新成功');
      setEditingUser(null);
      refreshUsers();  // ← 正確重新載入
    } else {
      toast.error(result.error || '更新失敗');
    }
  };

  const handleDelete = async (userId: string) => {
    const result = await deleteUserAction(userId);
    if (result.success) {
      toast.success('用戶刪除成功');
      refreshUsers();  // ← 正確重新載入
    } else {
      toast.error(result.error || '刪除失敗');
    }
  };

  const openEditDialog = (user: User) => {
    editForm.reset({
      username: user.username,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
    });
    setEditingUser(user);
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  console.log("data : ", users , "-- End --")
  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">用戶管理</h1>

        {/* 新增用戶 Dialog */}
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>新增用戶</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新增一般用戶</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField control={createForm.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel>使用者名稱（必填）</FormLabel>
                    <FormControl><Input placeholder="輸入使用者名稱" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>姓名（選填）</FormLabel>
                    <FormControl><Input placeholder="王小明" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email（選填）</FormLabel>
                    <FormControl><Input type="email" placeholder="example@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>手機（選填）</FormLabel>
                    <FormControl><Input placeholder="0912345678" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>密碼（必填）</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit">建立用戶</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 角色篩選 */}
      <div className="mb-6">
        <Select 
          value={roleFilter || "all"} 
          onValueChange={(value) => {
            setRoleFilter(value === "all" ? "" : value as 'USER' | 'ADMIN');
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="篩選角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="USER">USER</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 用戶列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <CardTitle>{user.username}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>姓名：{user.name || '無'}</p>
              <p>Email：{user.email || '無'}</p>
              <p>電話：{user.phone || '無'}</p>
              <p>角色：<span className={user.role === 'ADMIN' ? 'text-red-600' : 'text-green-600'}>{user.role}</span></p>
              <p className="text-sm text-gray-500">建立時間：{new Date(user.createdAt).toLocaleString()}</p>

              <div className="flex gap-2 pt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/users/${user.id}`}>查看詳情</Link>
                </Button>

                {user.role === 'USER' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                      <Edit className="h-4 w-4 mr-1" /> 編輯
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>確認刪除？</AlertDialogTitle>
                          <AlertDialogDescription>
                            刪除用戶 {user.username} 後無法復原，且若有訂單將拒絕刪除。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(user.id)}>
                            確認刪除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 編輯 Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>編輯用戶：{editingUser?.username}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField control={editForm.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>使用者名稱</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名（選填）</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email（選填）</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>手機（選填）</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>新密碼（留空則不修改）</FormLabel>
                  <FormControl><Input type="password" placeholder="留空不變更" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit">儲存變更</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}