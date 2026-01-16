// app/register/page.tsx

import RegisterForm from "@/components/Auth/RegisterForm";
import Link from "next/link";

export const metadata = { title: "註冊 | 您的電商" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">建立帳號</h2>
          <p className="mt-2 text-gray-600">加入我們，一起購物吧！</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-gray-600">
          已經有帳號？{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            立即登入
          </Link>
        </p>
      </div>
    </div>
  );
}