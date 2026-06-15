import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { getUserProfile } from "@/lib/get-user-profile";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUserProfile();

  if (!user) {
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
