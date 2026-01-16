

import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import UserHome from "../components/UserHomePage";

const UserPage = async () => {
    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }
   
console.log(" session : ", session , "-- End --");


    return (
        <>
            <UserHome userdata={session}/>
        </>
    )
}

export default UserPage