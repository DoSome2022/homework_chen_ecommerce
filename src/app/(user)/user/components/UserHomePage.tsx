
import { Session } from "next-auth";
// 直接用 next-auth 的 Session 型別（最準、最專業！）
interface Props {
  userdata: Session | null; // session 可能為 null
}




const UserHome = ({userdata}:Props) => {
      // 安全檢查（推薦！）
  if (!userdata?.user) {
    return <div>載入中...</div>;
  }
    
    console.log(" session_userdata : ", userdata, "-- End --")

    return(
        <>
        <div>
             <p>HI!<span>{userdata.user.name}</span></p>
        </div>
        </>
    )
}

export default UserHome