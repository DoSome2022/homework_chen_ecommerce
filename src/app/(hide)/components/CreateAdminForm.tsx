"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAdminAction } from "@/action/Auth/route";

 


const CreateAdminForm = () => {

 const [state, formAction, isPending] = useActionState(registerAdminAction, undefined);


    return(
        <>
     <form action={formAction} className="space-y-6">
      <div>
        <Label>用戶名</Label>
        <Input name="username" required />
        {state?.error?.username?.[0] && (
          <p className="text-sm text-red-600 mt-1">{state.error.username[0]}</p>
        )}
      </div>

      <div>
        <Label>Email（選填）</Label>
        <Input name="email" type="email" />
        {state?.error?.email?.[0] && (
          <p className="text-sm text-red-600 mt-1">{state.error.email[0]}</p>
        )}
      </div>

      <div>
        <Label>密碼</Label>
        <Input name="password" type="password" required />
        {state?.error?.password?.[0] && (
          <p className="text-sm text-red-600 mt-1">{state.error.password[0]}</p>
        )}
      </div>

      <div>
        <Label>確認密碼</Label>
        <Input name="confirmPassword" type="password" required />
        {state?.error?.confirmPassword?.[0] && (
          <p className="text-sm text-red-600 mt-1">{state.error.confirmPassword[0]}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '建立帳號中...' : '建立帳號'}
      </Button>
    </form>

        </>
    )
}

export default CreateAdminForm