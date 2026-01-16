import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import MaterialLists from "./componants/MaterialLists"


const MaterialListsPage = async () =>{
    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }
    return(
        <>
        <MaterialLists />
        </>
    )
}

export default MaterialListsPage