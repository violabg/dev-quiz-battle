import { Card } from "@/components/ui/card";

export function ProfileContentError({ error }: { error: string }) {
  return (
    <div className="flex flex-col justify-center items-center min-h-[60vh]">
      <Card className="p-8 w-full max-w-md text-center">
        <h2 className="mb-4 font-bold text-gradient text-2xl">Profilo</h2>
        <p className="mb-4 text-red-500">{error}</p>
      </Card>
    </div>
  );
}
