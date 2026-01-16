import { redirect } from "next/navigation";
import { auth } from "../../../../../../auth";
import CreatecategoryForm from "../componants/CreateCategoriesForm"



const CreatecategoryPage = async () => {

    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }
    return(
        <>
        <CreatecategoryForm />;
        </>
    )
}

export default CreatecategoryPage