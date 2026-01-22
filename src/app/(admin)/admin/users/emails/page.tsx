// src/app/(admin)/admin/users/emails/page.tsx
import { redirect } from "next/navigation";

import EmailList from "./components/EmailList";
import { auth } from "../../../../../../auth";

export default async function EmailsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return <EmailList />;
}