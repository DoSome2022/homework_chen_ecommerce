// src/app/(admin)/admin/components/AdminHomePage.tsx
"use client";

import { Session } from "next-auth";

// 直接用 next-auth 的 Session 型別（最準、最專業！）
interface Props {
  userdata: Session | null; // session 可能為 null
}

const AdminHome = ({ userdata }: Props) => {
  // 安全檢查（推薦！）
  if (!userdata?.user) {
    return <div>載入中...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">
        歡迎回來，<span className="text-primary">{userdata.user.name || "Admin"}</span>！
      </h1>
      <p className="text-lg text-gray-600">
        您是 <span className="font-semibold text-green-600">管理員</span> 身份登入
      </p>
      <div className="mt-6 p-6 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          角色：{userdata.user.role} 
          
        </p>
      </div>
    </div>
  );
};

export default AdminHome;