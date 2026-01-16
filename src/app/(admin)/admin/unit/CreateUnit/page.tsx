import { redirect } from "next/navigation";
import { auth } from "../../../../../../auth";
import CreateUnitForm from "../components/CreateUnitForm"

const CreateUnitPage = async () => {
    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }
    return(
        <>
        <CreateUnitForm />;
        </>
    )
}

export default CreateUnitPage