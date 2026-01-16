// src/app/(user)/user/[id]/checkout/page.tsx
import { redirect } from 'next/navigation';

import CheckoutForm from '@/app/checkout/CheckoutForm';
import StripeProvider from './component/StripeProvider';
import { auth } from '../../../../../../auth';


export default async function CheckoutPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <StripeProvider>
      <CheckoutForm />
    </StripeProvider>
  );
}