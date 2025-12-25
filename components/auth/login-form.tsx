"use client";
import { GithubIcon } from "@/components/icons/github";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuthActions } from "@convex-dev/auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import PasswordInput from "../ui/password-input";

const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Minimo 6 caratteri"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });
  const {
    handleSubmit,
    register,
    formState: { errors, isValid },
  } = form;
  const [isPending, startTransition] = useTransition();
  const { signIn } = useAuthActions();
  const router = useRouter();

  const handleLogin = async (values: LoginFormValues) => {
    startTransition(async () => {
      try {
        // Password authentication - user initialization is automatic via Convex Auth
        const formData = new FormData();
        formData.append("email", values.email);
        formData.append("password", values.password);
        formData.append("redirectTo", "/dashboard");
        formData.append("flow", "signIn");
        await signIn("password", formData);

        router.push("/dashboard");
      } catch (error: unknown) {
        toast.error("Errore", {
          description:
            error instanceof Error
              ? error.message
              : "Failed to sign in with Resend",
        });
      }
    });
  };

  const handleGitHubLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        // GitHub authentication - user initialization is automatic via Convex Auth
        const formData = new FormData();
        formData.append("redirectTo", "/dashboard");
        await signIn("github", formData);
        router.push("/dashboard");
      } catch (error: unknown) {
        toast.error("Errore", {
          description:
            error instanceof Error
              ? error.message
              : "Failed to sign in with GitHub",
        });
      }
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="gradient-border glass-card">
        <CardHeader>
          <CardTitle className="text-2xl">Accedi</CardTitle>
          <CardDescription>Accedi con il tuo account GitHub</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(handleLogin)}
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
                  disabled={isPending}
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={errors.email ? [errors.email] : []} />
              </Field>

              <Field data-invalid={!!errors.password}>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/auth/forgot-password"
                    className="inline-block ml-auto text-sm hover:underline underline-offset-4"
                  >
                    Password dimenticata?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  disabled={isPending}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <FieldError errors={errors.password ? [errors.password] : []} />
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !isValid}
            >
              {isPending ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>
          <Separator className="my-4" />

          <div className="flex flex-col gap-6">
            <Button
              className="flex justify-center items-center gap-2 bg-background hover:bg-accent border border-input w-full text-black dark:text-white transition-colors hover:text-accent-foreground"
              disabled={isPending}
              onClick={handleGitHubLogin}
            >
              <GithubIcon className="w-5 h-5" />
              <span className="font-medium">
                {isPending ? "Accesso in corso..." : "Accedi con GitHub"}
              </span>
            </Button>
          </div>
          <div className="mt-4 text-sm text-center">
            Non hai un account?{" "}
            <Link href="/auth/sign-up" className="underline underline-offset-4">
              Registrati
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
