// src/app/(user)/checkout/success/page.tsx
import { redirect } from "next/navigation";
import SuccessClient from "../component/Success";
import { auth } from "../../../../../../../auth";


export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { order } = await searchParams;
  const  userId  = session?.user?.id as string;

  return <SuccessClient orderNumber={order} userId={userId} />;
}