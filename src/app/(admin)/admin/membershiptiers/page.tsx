'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createMembershipTier, deleteMembershipTier, updateMembershipTier } from '@/action/membershipTierActions/route';
import { MembershipLevel } from '@prisma/client';

// 表單輸入的 schema（benefits 是逗號分隔字串）
const tierSchema = z.object({
  level: z.enum(['FREE', 'SILVER', 'GOLD', 'PLATINUM']),
  name: z.string().min(2, '名稱至少 2 個字'),
  price: z.number().int().min(0, '價格必須為非負整數'),
  benefits: z.string().min(1, '至少填寫一項權益'),
  color: z.string().optional(),
});

// 提交到 Server Action 時的資料型別（benefits 轉為陣列）
type TierFormInput = z.infer<typeof tierSchema>;

type TierSubmitData = Omit<TierFormInput, 'benefits'> & {
  benefits: string[];
};

type MembershipTier = {
  id: string;
  level: MembershipLevel;
  name: string;
  price: number;
  benefits: string[];
  color?: string | null;
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MembershipTiersPage() {
  const { data: tiers = [], isLoading, mutate } = useSWR<MembershipTier[]>('/api/admin/membership-tiers', fetcher);
  const [open, setOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);

  const form = useForm<TierFormInput>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      level: 'FREE',
      name: '',
      price: 0,
      benefits: '',
      color: '',
    },
  });

  const onSubmit = async (data: TierFormInput) => {
    // 將逗號分隔字串轉為陣列
    const submitData: TierSubmitData = {
      ...data,
      benefits: data.benefits
        .split(',')
        .map(b => b.trim())
        .filter(Boolean),
    };

    const result = editingTier
      ? await updateMembershipTier(editingTier.id, submitData)
      : await createMembershipTier(submitData);

    if (result.success) {
      toast.success(result.message);
      form.reset();
      setOpen(false);
      setEditingTier(null);
      mutate();
    } else {
      toast.error(result.error);
    }
  };

  const handleEdit = (tier: MembershipTier) => {
    form.reset({
      level: tier.level,
      name: tier.name,
      price: tier.price,
      benefits: tier.benefits.join(', '),  // 陣列轉回逗號分隔字串
      color: tier.color || '',
    });
    setEditingTier(tier);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此等級嗎？')) return;
    const result = await deleteMembershipTier(id);
    if (result.success) {
      toast.success(result.message);
      mutate();
    } else {
      toast.error(result.error);
    }
  };

  if (isLoading) return <div className="p-8"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">會員等級管理</h1>
        <Dialog open={open} onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setEditingTier(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> 新增等級</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTier ? '編輯等級' : '新增等級'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>等級代碼</FormLabel>
                      <FormControl>
                        <select {...field} className="border rounded p-2 w-full" disabled={!!editingTier}>
                          <option value="FREE">FREE</option>
                          <option value="SILVER">SILVER</option>
                          <option value="GOLD">GOLD</option>
                          <option value="PLATINUM">PLATINUM</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>顯示名稱</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>年費（元）</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="benefits" render={({ field }) => (
                  <FormItem>
                    <FormLabel>權益（用逗號分隔）</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="9折優惠, 免運費, 優先客服" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="color" render={({ field }) => (
                  <FormItem>
                    <FormLabel>顯示顏色（選填）</FormLabel>
                    <FormControl><Input type="color" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
                  <Button type="submit">{editingTier ? '儲存' : '建立'}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <Card key={tier.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: tier.color || '#ccc' }} />
                {tier.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">代碼：{tier.level}</p>
              <p className="font-medium mt-2">年費：NT${tier.price}</p>
              <div className="mt-3">
                <p className="text-sm font-medium">權益：</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {tier.benefits.map((b, i) => (
                    <Badge key={i} variant="secondary">{b}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" size="sm" onClick={() => handleEdit(tier)}>
                  <Edit className="h-4 w-4 mr-1" /> 編輯
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(tier.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> 刪除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}