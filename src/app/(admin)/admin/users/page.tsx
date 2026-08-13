// src/app/(admin)/admin/users/page.tsx
'use client';

import useSWR, { useSWRConfig } from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Edit, Trash2, Search } from 'lucide-react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createUserAction, updateUserAction, deleteUserAction } from '@/action/User/route';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// ── 型別 ──────────────────────────────────────────────
type MembershipLevel = 'FREE' | 'SILVER' | 'GOLD' | 'PLATINUM';

type User = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: 'ADMIN' | 'USER';
  currentMembershipLevel: MembershipLevel;
  membership?: {
    tierLevel: MembershipLevel;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    autoRenew: boolean;
    tier?: {
      name: string;
      color: string | null;
      benefits: string[];
      price: number;
    } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

// ── Zod Schema ────────────────────────────────────────
const membershipLevelEnum = z.enum(['FREE', 'SILVER', 'GOLD', 'PLATINUM']);

const createUserSchema = z.object({
  username: z.string().min(3, '使用者名稱至少 3 個字'),
  name: z.string().optional(),
  email: z.string().email('Email 格式錯誤').optional().or(z.literal('')),
  phone: z.string().regex(/^09\d{8}$/, '手機格式錯誤（09 開頭共 10 碼）').optional().or(z.literal('')),
  password: z.string().min(6, '密碼至少 6 個字'),
  currentMembershipLevel: membershipLevelEnum.optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

const editUserSchema = createUserSchema.partial().extend({
  password: z.string().min(6).optional().or(z.literal('')),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

// ── 等級 Badge 顏色 ───────────────────────────────────
const membershipColors: Record<MembershipLevel, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  SILVER: 'bg-gray-200 text-gray-700',
  GOLD: 'bg-yellow-100 text-yellow-800',
  PLATINUM: 'bg-purple-100 text-purple-800',
};

function MembershipBadge({ user }: { user: User }) {
  const level = user.membership?.tierLevel ?? user.currentMembershipLevel;
  const displayName = user.membership?.tier?.name ?? level;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${membershipColors[level]}`}>
      {displayName}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────
export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<'USER' | 'ADMIN' | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { mutate: swrMutate } = useSWRConfig();
  const currentKey = roleFilter ? `/api/admin/user?role=${roleFilter}` : '/api/admin/user';

  const { data: users = [], isLoading } = useSWR<User[]>(
    currentKey,
    fetcher,
    { revalidateOnFocus: false }
  );

  // 前端搜尋過濾
  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();

    return (
      user.username.toLowerCase().includes(query) ||
      (user.name && user.name.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      (user.phone && user.phone.includes(query))
    );
  });

  // ── 表單 ────────────────────────────────────────────
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      currentMembershipLevel: 'FREE',
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      currentMembershipLevel: 'FREE',
    },
  });

  const refreshUsers = () => {
    swrMutate(currentKey);
    swrMutate('/api/admin/user');
  };

  const handleCreateSubmit = async (data: CreateUserFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    const result = await createUserAction(formData);
    if (result.success) {
      toast.success(result.message || '用戶新增成功');
      createForm.reset();
      setOpenCreate(false);
      refreshUsers();
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
      refreshUsers();
    } else {
      toast.error(result.error || '更新失敗');
    }
  };

  const handleDelete = async (userId: string) => {
    const result = await deleteUserAction(userId);
    if (result.success) {
      toast.success('用戶刪除成功');
      refreshUsers();
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
      currentMembershipLevel: user.membership?.tierLevel ?? user.currentMembershipLevel,
    });
    setEditingUser(user);
  };

// ── 共用會員等級 Select ─────────────────────────────
const MembershipLevelSelect = ({
  field,
}: {
  field: {
    value: string | undefined;
    onChange: (value: string) => void;
  };
}) => (
  <Select onValueChange={field.onChange} value={field.value ?? 'FREE'}>
    <FormControl>
      <SelectTrigger>
        <SelectValue placeholder="選擇會員等級" />
      </SelectTrigger>
    </FormControl>
    <SelectContent>
      <SelectItem value="FREE">免費會員</SelectItem>
      <SelectItem value="SILVER">銀級會員</SelectItem>
      <SelectItem value="GOLD">金級會員</SelectItem>
      <SelectItem value="PLATINUM">白金會員</SelectItem>
    </SelectContent>
  </Select>
);


  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">用戶管理</h1>

        {/* 搜尋欄 + 新增按鈕 */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜尋用戶名稱、姓名、Email、手機..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button>新增用戶</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>新增用戶</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                  <FormField control={createForm.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>使用者名稱</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名（選填）</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email（選填）</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>手機（選填）</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>密碼</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField
                    control={createForm.control}
                    name="currentMembershipLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>會員等級</FormLabel>
                        <MembershipLevelSelect field={field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit">新增用戶</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
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
        {filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            {searchQuery ? "無符合搜尋結果的用戶" : "目前沒有用戶資料"}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle>{user.username}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>姓名：{user.name || '無'}</p>
                <p>Email：{user.email || '無'}</p>
                <p>電話：{user.phone || '無'}</p>
                <p>
                  角色：
                  <span className={user.role === 'ADMIN' ? 'text-red-600' : 'text-green-600'}>
                    {user.role}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  會員等級：
                  <MembershipBadge user={user} />
                </p>
                {user.membership?.endsAt && (
                  <p className="text-sm text-gray-500">
                    會員到期：{new Date(user.membership.endsAt).toLocaleDateString()}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  建立時間：{new Date(user.createdAt).toLocaleString()}
                </p>

                <div className="flex gap-2 pt-4">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/users/${user.id}`}>查看詳情</Link>
                  </Button>

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
                </div>
              </CardContent>
            </Card>
          ))
        )}
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
              <FormField
                control={editForm.control}
                name="currentMembershipLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>會員等級</FormLabel>
                    <MembershipLevelSelect field={field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
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
