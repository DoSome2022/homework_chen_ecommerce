import { redirect } from "next/navigation";
import { auth } from "../../../../../../auth";

import CartClient from "@/components/Cart/CartClient";


const CartPage = async () => {

      const session = await auth();
    
      if (!session?.user) {
        redirect("/login"); // ← 直接跳轉！
      }  

  return (

    <CartClient/>

  )
}

export default CartPage