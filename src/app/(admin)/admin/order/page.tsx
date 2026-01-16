import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import AdminOrderList from "./components/AdminOrderList"

const AdminOrderPage = async () => {

const session = await auth();

  if (!session?.user) {
    redirect("/login"); // ← 直接跳轉！
  }

return(
    <AdminOrderList />
)

}

export default AdminOrderPage