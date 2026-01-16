// app/cart/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import CartClient from '@/components/Cart/CartClient';

export default async function CartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // 完全不需要 getCart()！因為 useCart 會自動從 localStorage 讀
  return <CartClient />;
}