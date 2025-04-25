import { Navbar } from "@/components/layout/navbar"
import { AuthForm } from "@/components/auth/auth-form"

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">
            <span className="text-gradient">Join DevQuizBattle</span>
          </h1>
          <AuthForm />
        </div>
      </main>
    </div>
  )
}
