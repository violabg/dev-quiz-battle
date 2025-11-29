"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// Removed unused Label import
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email non valida"),
});
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });
  const { handleSubmit, setError } = form;

  const handleForgotPassword = async (values: ForgotPasswordFormValues) => {
    const supabase = createClient();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/auth/update-password`,
        }
      );
      if (error) throw error;
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
            <Form {...form}>
              <form
                onSubmit={handleSubmit(handleForgotPassword)}
                className="space-y-4"
                autoComplete="off"
              >
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="m@example.com"
                          autoComplete="email"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !form.formState.isValid}
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
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
