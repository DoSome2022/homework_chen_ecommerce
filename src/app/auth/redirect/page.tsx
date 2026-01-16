// app/auth/redirect/page.tsx

import { redirect } from "next/navigation";
import { auth } from "../../../../auth";

export default async function AuthRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  if (session.user.role === "USER") {
    redirect(`/user/${session.user.id}`);
  }

  redirect("/");
}