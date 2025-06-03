// Client component for language filter
"use client";
import { LANGUAGE_OPTIONS } from "@/components/game/question-selection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <div className="relative flex items-center gap-2">
      <label htmlFor="language" className="font-medium text-lg">
        Language:
      </label>
      <div className="relative">
        <Select
          value={language || "all"}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value && value !== "all") {
              params.set("language", value);
            } else {
              params.delete("language");
            }
            startTransition(() => {
              router.replace(`${pathname}?${params.toString()}` as any);
            });
          }}
          disabled={isPending}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && (
          <Loader2 className="top-1/2 right-[-20px] absolute w-4 h-4 text-gray-500 -translate-y-1/2 animate-spin" />
        )}
      </div>
    </div>
  );
};
export default LeaderboardLanguageFilter;
