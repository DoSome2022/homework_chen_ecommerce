// lib/auth/actions.ts
"use server";


import bcrypt from "bcryptjs";

import { AuthError } from "next-auth";
import { z } from "zod";

import { auth, authSignIn } from "../../../auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { FormState } from "../../../types/auth";



const loginSchema = z.object({
  username: z.string().min(1, "請輸入用戶名"),
  password: z.string().min(1, "請輸入密碼"),
});

const registerSchema = z.object({
  username: z.string().min(3, "用戶名至少 3 個字"),
  password: z.string().min(6, "密碼至少 6 碼"),
  confirmPassword: z.string(),
  email: z.string().email().optional().or(z.literal("")),
}).refine((d) => d.password === d.confirmPassword, {
  message: "兩次密碼不一致",
  path: ["confirmPassword"],
});

// lib/auth/actions.ts
export async function loginAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
     await authSignIn("credentials", {
      username: parsed.data.username,
      password: parsed.data.password,
      redirect: false,
    });

    // 關鍵：手動取得 session，判斷角色！
    const session = await auth();
    if (!session?.user?.id) {
      return { error: { credentials: ["登入失敗，請再試一次"] } };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return { error: { credentials: ["帳號異常"] } };
    }

    // 根據角色回傳跳轉路徑
    if (user.role === "ADMIN") {
      return { success: true, redirectTo: "/admin" };
    } else {
      return { success: true, redirectTo: `/user/${session.user.id}` };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: { credentials: ["用戶名或密碼錯誤"] } };
    }
    throw error;
  }
}


export async function registerAction(
  prevState: FormState | undefined, // 改為可選的
  formData: FormData
): Promise<FormState | undefined> { // 回傳類型也改為可選的
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { username, password, email } = parsed.data;

  const orConditions: Prisma.UserWhereInput["OR"] = [
    { username },
  ];

  if (email) {
    orConditions.push({ email });
  }

  const exists = await db.user.findFirst({
    where: {
      OR: orConditions,
    },
  });

  if (exists) {
    return {
      error: {
        username: exists.username === username ? ["此用戶名已有人使用"] : undefined,
        email: exists.email === email ? ["此 Email 已註冊"] : undefined,
      },
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({
    data: { username, passwordHash, email: email || null, name: username, role: "USER" },
  });

  await authSignIn("credentials", { username, password, redirectTo: "/user" });
  return { success: true };
}



export async function registerAdminAction(
  prevState: FormState | undefined, // 改為可選的
  formData: FormData
): Promise<FormState | undefined> { // 回傳類型也改為可選的
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { username, password, email } = parsed.data;

  const orConditions: Prisma.UserWhereInput["OR"] = [
    { username },
  ];

  if (email) {
    orConditions.push({ email });
  }

  const exists = await db.user.findFirst({
    where: {
      OR: orConditions,
    },
  });

  if (exists) {
    return {
      error: {
        username: exists.username === username ? ["此用戶名已有人使用"] : undefined,
        email: exists.email === email ? ["此 Email 已註冊"] : undefined,
      },
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({
    data: { username, passwordHash, email: email || null, name: username, role: "ADMIN" },
  });

  await authSignIn("credentials", { username, password, redirectTo: "/admin" });
  return { success: true };
}