// src/app/layout.tsx （最上層！一定要在這裡包）
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/hooks/use-cart"; // ← 關鍵 import！
import { MembershipProvider } from "@/context/MembershipContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "德昌五金",
  description: "專業五金電商平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <CartProvider> {/* ← 包在這裡！全站都能用 useCart() */}
            <MembershipProvider>
              {children}
            </MembershipProvider>
            <Toaster />
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}