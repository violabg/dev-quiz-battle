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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useAuthActions } from "@convex-dev/auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import PasswordInput from "../ui/password-input";

const signUpSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username deve essere almeno 3 caratteri")
      .max(20, "Username deve essere massimo 20 caratteri")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Username può contenere solo lettere, numeri, underscore e trattini"
      ),
    email: z.string().email("Email non valida"),
    password: z.string().min(6, "Minimo 6 caratteri"),
    repeatPassword: z.string().min(6, "Minimo 6 caratteri"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.repeatPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repeatPassword"],
        message: "Passwords do not match",
      });
    }
  });
type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { signIn } = useAuthActions();
  const initializeUserProfile = useMutation(api.auth.initializeUserProfile);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      repeatPassword: "",
    },
    mode: "onChange",
  });
  const {
    handleSubmit,
    register,
    formState: { errors, isValid },
  } = form;

  const handleSignUp = async (values: SignUpFormValues) => {
    startTransition(async () => {
      try {
        // Sign up with email and password
        const formData = new FormData();
        formData.append("email", values.email);
        formData.append("password", values.password);
        formData.append("flow", "signUp");

        await signIn("password", formData);

        // Initialize user profile fields after successful signup
        await initializeUserProfile({
          username: values.username,
        });

        toast.success("Registrazione completata!");
        router.push("/dashboard");
      } catch (error: unknown) {
        console.error("Sign up error:", error);
        toast.error("Errore", {
          description:
            error instanceof Error
              ? error.message
              : "Impossibile completare la registrazione",
        });
      }
    });
  };

  const handleGitHubSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        // Sign up with GitHub - user initialization is automatic via Convex Auth
        const formData = new FormData();
        formData.append("redirectTo", "/dashboard");
        await signIn("github", formData);

        toast.success("Registrazione completata!");
        router.push("/dashboard");
      } catch (error: unknown) {
        console.error("GitHub sign up error:", error);
        toast.error("Errore", {
          description:
            error instanceof Error
              ? error.message
              : "Impossibile completare la registrazione con GitHub",
        });
      }
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="gradient-border glass-card">
        <CardHeader>
          <CardTitle className="text-2xl">Registrati</CardTitle>
          <CardDescription>Crea un nuovo account per giocare</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(handleSignUp)}
            className="space-y-4"
            autoComplete="off"
          >
            <FieldGroup>
              <Field data-invalid={!!errors.username}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  autoComplete="off"
                  disabled={isPending}
                  aria-invalid={!!errors.username}
                  {...register("username")}
                />
                <FieldError errors={errors.username ? [errors.username] : []} />
              </Field>

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
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isPending}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <FieldError errors={errors.password ? [errors.password] : []} />
              </Field>

              <Field data-invalid={!!errors.repeatPassword}>
                <FieldLabel htmlFor="repeatPassword">
                  Ripeti Password
                </FieldLabel>
                <PasswordInput
                  id="repeatPassword"
                  autoComplete="new-password"
                  disabled={isPending}
                  aria-invalid={!!errors.repeatPassword}
                  {...register("repeatPassword")}
                />
                <FieldError
                  errors={errors.repeatPassword ? [errors.repeatPassword] : []}
                />
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !isValid}
            >
              {isPending ? "Registrazione in corso..." : "Registrati"}
            </Button>
          </form>

          <Separator className="my-4" />

          <div className="flex flex-col gap-4">
            <Button
              className="flex justify-center items-center gap-2 bg-background hover:bg-accent border border-input w-full text-black dark:text-white transition-colors hover:text-accent-foreground"
              disabled={isPending}
              onClick={handleGitHubSignUp}
            >
              <GithubIcon className="w-5 h-5" />
              <span className="font-medium">
                {isPending
                  ? "Registrazione in corso..."
                  : "Registrati con GitHub"}
              </span>
            </Button>
          </div>

          <div className="mt-4 text-sm text-center">
            Hai già un account?{" "}
            <Link href="/auth/login" className="underline underline-offset-4">
              Accedi
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
