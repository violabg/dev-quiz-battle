import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SeedData from "@/scripts/seed-data";

export default function SeedPage() {
  return (
    <main className="flex-1 py-8 container">
      <h1 className="mb-8 font-bold text-3xl">
        <span className="text-gradient">Seed Test Data</span>
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Database Seeding Tool</CardTitle>
          <CardDescription>
            This will create test users and a sample game for development
            purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>This tool will create:</p>
            <ul className="space-y-1 pl-5 list-disc">
              <li>3 test user accounts with profiles</li>
              <li>1 sample game with all test users as players</li>
            </ul>
            <p className="text-muted-foreground text-sm">
              Note: You may need to check your email for verification links if
              email verification is enabled in your Supabase project.
            </p>
            <SeedData />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
