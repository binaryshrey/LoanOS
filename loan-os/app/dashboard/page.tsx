// app/dashboard/page.tsx
import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardClient from "@/components/DashboardClient";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  const now = new Date();
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const { user } = await withAuth();

  if (!user) {
    redirect("/sign-in");
  }

  const greeting = getGreeting();
  const formattedDate = getFormattedDate();
  const userName = user.firstName || user.email?.split("@")[0] || "User";

  return (
    <DashboardLayout user={user} currentPage="dashboard">
      <DashboardClient
        greeting={greeting}
        formattedDate={formattedDate}
        userName={userName}
        userId={user.id ?? user.email}
      />
    </DashboardLayout>
  );
}
