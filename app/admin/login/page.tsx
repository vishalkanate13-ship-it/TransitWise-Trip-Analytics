import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminLoginForm from "./admin-login-form";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.role === "ADMIN") redirect("/admin");
  return <AdminLoginForm />;
}
