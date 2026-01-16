// //app/admin/layout.tsx

// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "../../../app/globals.css";
// import Navbar from "./components/Navbar";


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
//     <html lang="en">
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//       >
//         {/* 添加导航栏 */}
//         <Navbar />
//         {/* 页面主要内容 */}
//         {children}
//       </body>
//     </html>
//   );
// }


// src/app/(admin)/layout.tsx （同樣刪除！）

import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import Navbar from "./components/Navbar";


export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">{children}</main>
    </>
  );
}