import { redirect } from "next/navigation";
import { auth } from "../../../../../../auth";
import ShopProductLists from "./components/ShopProductLists"

const ShopPage = async () => {

    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }
    return(
        <>
        <ShopProductLists />
        </>
    )
}

export default ShopPage