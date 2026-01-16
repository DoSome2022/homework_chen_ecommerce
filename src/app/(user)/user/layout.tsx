// // src/app/(user)/layout.tsx  （或你的使用者頁面群組的 layout）
// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "../../../app/globals.css";
// import Navbar from "./components/Navbar";
// import { SessionProvider } from "next-auth/react"; // ← 關鍵 import！
// import { Toaster } from "@/components/ui/sonner";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: "德昌",
//   description: "德昌五金",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <SessionProvider> {/* ← 關鍵：包一層 SessionProvider！ */}
//       <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
//         <Navbar />
//         {children}
//         <Toaster />
//       </body>
//     </SessionProvider>
//   );
// }


// src/app/(user)/layout.tsx （刪除 <body> 和 <html>！）

import { redirect } from "next/navigation";
import Navbar from "./components/Navbar";
import { auth } from "../../../../auth";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
    </>
  );
}