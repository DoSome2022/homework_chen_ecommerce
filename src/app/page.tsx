// src/app/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const { role, id } = session.user;
      console.log("role : ", role , "-- End --")

      if (role === 'ADMIN') {
        router.replace('/admin');
        return;
      }
      if (role === 'USER' && id) {
        router.replace(`/user/${id}`);
        return;
      }
      // fallback
      router.replace('/');
    }
  }, [status, session, router]);

  const [trackingNumber, setTrackingNumber] = useState("");

  // 關鍵：函數要定義在 return 外面！
  const checkSF = async () => {
    if (!trackingNumber.trim()) {
      toast.error("請輸入運單號");
      return;
    }

    toast.loading("查詢中...");

    try {
      const res = await fetch(`/api/sf-express?trackingNumber=${trackingNumber}`);
      const data = await res.json();

      toast.dismiss();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.routes && data.routes.length > 0) {
        toast.success("查詢成功！", {
          description: data.latest?.desc || "已簽收",
          duration: 5000,
        });
      } else {
        toast.info("查無資料");
      }

      console.log("順豐物流完整資料:", data);
    } catch {
      toast.dismiss();
      toast.error("查詢失敗，請稍後再試");
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center">
        <h1 className="text-4xl font-bold">順豐物流查詢測試</h1>

        <div className="flex gap-4 w-full max-w-md">
          <Input
            placeholder="輸入運單號（如：SF123456789TW）"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkSF()}
          />
          <Button onClick={checkSF} size="lg">
            查詢物流
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => setTrackingNumber("SF605123456TW")}
        >
          填入測試單號
        </Button>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}