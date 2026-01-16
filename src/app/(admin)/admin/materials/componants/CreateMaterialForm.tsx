//components/CreateCategoriesForm.tsx

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionState, useEffect } from "react";
import { createMaterialsAction } from "@/action/Material/route";




const formSchema = z.object({
  materials: z.string().min(1, "請輸入至少一個材料"),
});

type FormData = z.infer<typeof formSchema>;


export default function CreateMaterialForm() {
  const [state, formAction, isPending] = useActionState(createMaterialsAction, undefined);

  const {
    register,
    // handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  // 成功後清空表單
  useEffect(() => {
    if (state?.success) {
      reset();
    }
  }, [state?.success, reset]);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">建立材料</h1>

      <form action={formAction} className="space-y-6">
        <div>
          <Label htmlFor="materials">輸入材料</Label>
          <Textarea
            id="materials"
            {...register("materials")}
            placeholder="給一材料"
            rows={8}
            className="mt-2"
            disabled={isPending}
          />
          {errors.materials && (
            <p className="text-sm text-red-600 mt-1">{errors.materials.message}</p>
          )}
        </div>

        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-600 font-medium">{state.success}</p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? "建立中..." : "建立材料"}
        </Button>
      </form>

    </div>
  );
}