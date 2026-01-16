// src/app/(user)/checkout/success/page.tsx

import { redirect } from "next/navigation";
import { auth } from "../../../../../../../auth";
import SuccessClient from "../component/Success";


export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; session_id?: string; method?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SuccessClient
      orderNumber={params.orderId}
      userId={session.user.id}
      paymentMethod={params.method as "stripe" | "bank_transfer" | undefined}
    />
  );
}