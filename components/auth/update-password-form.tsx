"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { useAuthActions } from "@convex-dev/auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import PasswordInput from "../ui/password-input";

const updatePasswordSchema = z.object({
  password: z.string().min(6, {
    error: "Minimo 6 caratteri",
  }),
});
type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const authActions = useAuthActions();
  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "" },
    mode: "onChange",
  });
  const {
    handleSubmit,
    register,
    setError,
    formState: { errors, isValid },
  } = form;

  const handleUpdatePassword = async (values: UpdatePasswordFormValues) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("password", values.password);

      // Call Convex Auth's update password action
      await authActions.signIn("resend", formData);
      router.push("/");
    } catch (error: unknown) {
      setError("password", {
        message: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="gradient-border glass-card">
        <CardHeader>
          <CardTitle className="text-2xl">Reimposta la password</CardTitle>
          <CardDescription>
            Inserisci la tua nuova password qui sotto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(handleUpdatePassword)}
            className="space-y-4"
            autoComplete="off"
          >
            <FieldGroup>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">Nuova password</FieldLabel>
                <PasswordInput
                  id="password"
                  placeholder="New password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <FieldError errors={errors.password ? [errors.password] : []} />
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isValid}
            >
              {isLoading ? "Salvataggio..." : "Salva nuova password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
