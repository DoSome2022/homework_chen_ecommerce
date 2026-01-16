import { redirect } from "next/navigation";
import { auth } from "../../../../../../auth";
import CreateProductForm from "../components/CreateProductForm"

const CreateProductPage = async () => {
    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }
    return(
        <CreateProductForm/>
    )
}

export default CreateProductPage