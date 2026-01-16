// app/checkout/page.tsx
import { getCart } from '@/action/Cart/route';



import { redirect } from 'next/navigation';
import CheckoutForm from './CheckoutForm';
import { auth } from '../../../auth';

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    redirect('/cart');
  }

  return <CheckoutForm />;
}