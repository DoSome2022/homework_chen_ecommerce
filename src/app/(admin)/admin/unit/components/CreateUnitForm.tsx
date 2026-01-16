//components/CreateUnitForm.tsx

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionState, useEffect } from "react";
import { createUnitsAction } from "@/action/Unit/route";


const formSchema = z.object({
  units: z.string().min(1, "請輸入至少一個單位"),
});

type FormData = z.infer<typeof formSchema>;


export default function CreateUnitForm() {
  const [state, formAction, isPending] = useActionState(createUnitsAction, undefined);

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
      <h1 className="text-3xl font-bold mb-8">建立單位</h1>

      <form action={formAction} className="space-y-6">
        <div>
          <Label htmlFor="units">輸入單位（支援多種格式）</Label>
          <Textarea
            id="units"
            {...register("units")}
            placeholder="給一單位"
            rows={8}
            className="mt-2"
            disabled={isPending}
          />
          {errors.units && (
            <p className="text-sm text-red-600 mt-1">{errors.units.message}</p>
          )}
        </div>

        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-600 font-medium">{state.success}</p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? "建立中..." : "建立單位"}
        </Button>
      </form>

    </div>
  );
}