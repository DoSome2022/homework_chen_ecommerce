import { redirect } from "next/navigation";
import { auth } from "../../../../../../auth";
import CreateMaterialForm from "../componants/CreateMaterialForm"


const CreateMaterialPage = async () => {
    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }
    return(
        <>
        <CreateMaterialForm />;
        </>
    )
}

export default CreateMaterialPage