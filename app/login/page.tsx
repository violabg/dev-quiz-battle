import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 justify-center items-center p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 font-bold text-2xl text-center">
          <span className="text-gradient">Entra in DevQuizBattle</span>
        </h1>
        <AuthForm />
      </div>
    </main>
  );
}
