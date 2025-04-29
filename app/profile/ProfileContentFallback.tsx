import { Loader2 } from "lucide-react";

export function ProfileContentFallback() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[60vh]">
      <Loader2 className="mb-4 w-8 h-8 text-primary animate-spin" />
      <span>Caricamento profilo...</span>
    </div>
  );
}
