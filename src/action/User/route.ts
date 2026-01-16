// src/action/User/route.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import bcrypt from 'bcryptjs'; // 專案已有 bcryptjs
import { auth } from '../../../auth';

// Zod Schema：新增用戶
const createUserSchema = z.object({
  username: z.string().min(3, '使用者名稱至少 3 個字'),
  email: z.string().email('請輸入有效 Email').optional().or(z.literal('')),
  phone: z.string().regex(/^09\d{8}$/, '手機格式錯誤').optional().or(z.literal('')),
  password: z.string().min(6, '密碼至少 6 個字'),
  name: z.string().optional(),
});

// Zod Schema：更新用戶（密碼可選）
const updateUserSchema = createUserSchema.partial().extend({
  password: z.string().min(6).optional().or(z.literal('')),
});

export async function createUserAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: '未授權' };
  }

  const raw = Object.fromEntries(formData);
  const validated = createUserSchema.safeParse(raw);

  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  const { username, email, phone, password, name } = validated.data;

  // 檢查 username / email 是否重複
  const existing = await db.user.findFirst({
    where: { OR: [{ username }, email ? { email } : {}] },
  });

  if (existing) {
    return { success: false, error: '使用者名稱或 Email 已存在' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.user.create({
    data: {
      username,
      email: email || null,
      phone: phone || null,
      name: name || null,
      passwordHash,
      role: 'USER', // 強制為 USER
    },
  });

  revalidatePath('/admin/users');
  return { success: true, message: '用戶新增成功' };
}

export async function updateUserAction(userId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: '未授權' };
  }

  // 禁止修改 ADMIN 帳號
  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser || targetUser.role === 'ADMIN') {
    return { success: false, error: '無法修改 ADMIN 或用戶不存在' };
  }

  const raw = Object.fromEntries(formData);
  const validated = updateUserSchema.safeParse(raw);

  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  const { username, email, phone, password, name } = validated.data;

  // 檢查重複（排除自己）
  const existing = await db.user.findFirst({
    where: {
      OR: [{ username }, email ? { email } : {}],
      NOT: { id: userId },
    },
  });

  if (existing) {
    return { success: false, error: '使用者名稱或 Email 已存在' };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      username,
      email: email || null,
      phone: phone || null,
      name: name || null,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  return { success: true, message: '用戶更新成功' };
}

export async function deleteUserAction(userId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: '未授權' };
  }

  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser || targetUser.role === 'ADMIN') {
    return { success: false, error: '無法刪除 ADMIN 或用戶不存在' };
  }

  // 可選：檢查是否有訂單，若有可阻止刪除
  const hasOrders = await db.order.count({ where: { userId } });
  if (hasOrders > 0) {
    return { success: false, error: '該用戶有訂單記錄，無法刪除' };
  }

  await db.user.delete({ where: { id: userId } });

  revalidatePath('/admin/users');
  redirect('/admin/users');
}