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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthActions } from "@convex-dev/auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.email(),
});
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const authActions = useAuthActions();
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });
  const {
    handleSubmit,
    register,
    setError,
    formState: { errors, isValid },
  } = form;

  const handleForgotPassword = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", values.email);
      formData.append(
        "redirectUrl",
        `${window.location.origin}/auth/update-password`
      );

      // Call Convex Auth's reset password action
      await authActions.signIn("resend", formData);
      setSuccess(true);
    } catch (error: unknown) {
      setError("email", {
        message: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card className="gradient-border glass-card">
          <CardHeader>
            <CardTitle className="text-2xl">Controlla la tua email</CardTitle>
            <CardDescription>
              Istruzioni per il reset della password inviate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Se ti sei registrato con email e password, riceverai una email per
              il reset della password.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="gradient-border glass-card">
          <CardHeader>
            <CardTitle className="text-2xl">Reimposta la password</CardTitle>
            <CardDescription>
              Inserisci la tua email e ti invieremo un link per reimpostare la
              password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(handleForgotPassword)}
              className="space-y-4"
              autoComplete="off"
            >
              <FieldGroup>
                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                  <FieldError errors={errors.email ? [errors.email] : []} />
                </Field>
              </FieldGroup>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isValid}
              >
                {isLoading ? "Invio in corso..." : "Invia email di reset"}
              </Button>
              <div className="mt-4 text-sm text-center">
                Hai già un account?{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Accedi
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
