// src/app/(user)/checkout/success/SuccessClient.tsx
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SuccessClient({ orderNumber, userId }: { orderNumber?: string , userId?: string}) {
  return (
    <div className="text-center py-24">
      <h1 className="text-4xl font-bold text-green-600 mb-6">訂單建立成功！</h1>
      <p className="text-xl mb-8">
        訂單編號：{orderNumber || "未知"}
      </p>
      <Button asChild size="lg">
        <Link href={`/user/${userId}/order`}>查看我的訂單</Link>
      </Button>
    </div>
  );
}