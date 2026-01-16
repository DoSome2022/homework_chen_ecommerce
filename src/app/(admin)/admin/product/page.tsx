import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import ProductListPage from "./components/ProductList"

const productListsPage = async () => {
const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }

    return(
        <>
        <ProductListPage/>
        </>
    )
}

export default productListsPage