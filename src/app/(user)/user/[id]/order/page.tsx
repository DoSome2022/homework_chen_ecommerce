import { redirect } from "next/navigation";
import { auth } from "../../../../../../auth";
import OrderLists from "./components/orderLists";


const OrderPage = async () => {
    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }

    return(
        <>
        <OrderLists />
        </>
    )
}

export default OrderPage