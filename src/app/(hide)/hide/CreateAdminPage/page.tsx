
import CreateAdminForm from "../../components/CreateAdminForm";



const CreateAdmin = () => {
    return(
        <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">建立Admin</h2>
          
        </div>
        <CreateAdminForm />

      </div>
      </div>
        </>
    )
}
export default CreateAdmin