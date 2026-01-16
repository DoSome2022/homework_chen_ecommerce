import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import UnitLists from "./components/UnitLists"

const UnitListsPage = async () =>{
    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }
    return(
        <>
        <UnitLists />
        </>
    )
}

export default UnitListsPage