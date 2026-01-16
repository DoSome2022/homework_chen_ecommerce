
import { redirect } from "next/navigation";

import { auth } from "../../../../../auth";
import AccountList from "./components/AccountList";

export const metadata = {
  title: "帳務管理 - 每日結算總覽",
};

export default async function AccountantPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">帳務總覽</h1>
      <AccountList />
    </div>
  );
}

