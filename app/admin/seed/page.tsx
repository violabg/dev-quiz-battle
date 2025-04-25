"use client"

import { Navbar } from "@/components/layout/navbar"
import SeedData from "@/scripts/seed-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SeedPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-8">
          <span className="text-gradient">Seed Test Data</span>
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Database Seeding Tool</CardTitle>
            <CardDescription>This will create test users and a sample game for development purposes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>This tool will create:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>3 test user accounts with profiles</li>
                <li>1 sample game with all test users as players</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Note: You may need to check your email for verification links if email verification is enabled in your
                Supabase project.
              </p>
              <SeedData />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
