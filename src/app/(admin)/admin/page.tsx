import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import AdminHome from "./components/AdminHomePage";


const adminPage = async () => {
    const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }
       
    console.log(" session : ", session , "-- End --");
    return (
        <>
            Admin Page
            <AdminHome userdata={session} />
        </>
    )
}

export default adminPage