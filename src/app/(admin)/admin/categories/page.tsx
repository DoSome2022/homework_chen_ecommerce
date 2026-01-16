import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import CategoryLists from "./componants/CategoryLists"



const MaterialListsPage = async () =>{
    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }

    return(
        <>
        <CategoryLists />
        </>
    )
}

export default MaterialListsPage