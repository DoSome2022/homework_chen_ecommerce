import { redirect } from "next/navigation";

import DiscountList from "./components/DiscountList";
import { auth } from "../../../../../auth";

export default async function DiscountsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return <DiscountList />;
}