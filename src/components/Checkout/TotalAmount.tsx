// src/app/checkout/TotalAmount.tsx
'use client';

import { useCart } from "@/hooks/use-cart";



export default function TotalAmount() {
  const { totalAmount } = useCart();
  return <>NT${totalAmount.toLocaleString()}</>;
}