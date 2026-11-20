import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminDashboard from "./admin-dashboard";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/routes");
  return <AdminDashboard adminName={session.name} />;
}
