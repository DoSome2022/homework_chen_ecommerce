// types/next-auth.d.ts   ← 只要這一個檔案就夠了！全部合併
import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: "ADMIN" | "USER";
    name?: string | null;
    email?: string | null;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      name?: string | null;
      email?: string | null;
      role: "ADMIN" | "USER";
    } & Session["user"]; // 保留原本的 name, email, image 等
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "ADMIN" | "USER";
  }
}

// 共用表單狀態（登入、註冊通用）
export type FormState = {
  error?: {
    username?: string[];
    password?: string[];
    confirmPassword?: string[];
    email?: string[];
    credentials?: string[];
  };
  success?: boolean;
  redirectTo?: string;  // ← 加上這行！
};