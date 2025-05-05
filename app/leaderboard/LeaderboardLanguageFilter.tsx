// Client component for language filter
"use client";
import { LANGUAGE_OPTIONS } from "@/components/game/question-selection";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type LeaderboardLanguageFilterProps = {
  language: string;
};

const LeaderboardLanguageFilter = ({
  language,
}: LeaderboardLanguageFilterProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <form method="get" className="relative flex items-center gap-2">
      <label htmlFor="language" className="font-medium text-lg">
        Language:
      </label>
      <div className="relative">
        <select
          id="language"
          name="language"
          defaultValue={language}
          className="bg-background px-3 py-1 border rounded text-foreground"
          onChange={(e) => {
            const value = e.target.value;
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
              params.set("language", value);
            } else {
              params.delete("language");
            }
            startTransition(() => {
              router.replace(`${pathname}?${params.toString()}`);
            });
          }}
          disabled={isPending}
        >
          <option value="">All</option>
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2 className="top-1/2 right-[-20px] absolute w-4 h-4 text-gray-500 -translate-y-1/2 animate-spin" />
        )}
      </div>
    </form>
  );
};
export default LeaderboardLanguageFilter;
