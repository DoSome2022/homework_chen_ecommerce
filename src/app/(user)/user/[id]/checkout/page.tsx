import { redirect } from "next/navigation";
import { auth } from "../../../../../../auth";
import CheckoutForm from "@/app/checkout/CheckoutForm";




const CheckoutPage = async () => {

    const session = await auth();
  
    if (!session?.user) {
      redirect("/login"); // ← 直接跳轉！
    }
  return(
    <CheckoutForm />
  )
}

export default CheckoutPage