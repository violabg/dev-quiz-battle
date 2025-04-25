import { AuthForm } from "@/components/auth/auth-form";
import { Navbar } from "@/components/layout/navbar";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex flex-1 justify-center items-center p-4">
        <div className="w-full max-w-md">
          <h1 className="mb-6 font-bold text-2xl text-center">
            <span className="text-gradient">Entra in DevQuizBattle</span>
          </h1>
          <AuthForm />
        </div>
      </main>
    </div>
  );
}
