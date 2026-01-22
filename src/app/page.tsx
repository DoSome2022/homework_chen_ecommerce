// src/app/page.tsx
import TrackingPageClient from "@/components/Tracking/TrackingPageClient";
import { auth } from "../../auth";
import { redirect } from "next/navigation";

// Server Component - 負責身份驗證和數據獲取
export default async function HomePage() {
  const session = await auth();

  // 已登入：根據角色跳轉
  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    } else {
      // 假設 User 角色跳轉到個人頁面
      redirect(`/user/${session.user.id}`);
    }
  }

  // 未登入：顯示追蹤頁面
  return <TrackingPageClient />;
}