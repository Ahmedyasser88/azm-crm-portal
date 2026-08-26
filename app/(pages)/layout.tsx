import AppLayout from "@/components/layout/AppLayout";
import { getCurrentUser } from "@/lib/api/identity.api";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return <AppLayout user={user}>{children}</AppLayout>;
}
