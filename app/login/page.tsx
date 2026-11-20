import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PassengerAuth from "./passenger-auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.role === "PASSENGER") redirect("/routes");
  if (session?.role === "ADMIN") redirect("/admin");
  return <PassengerAuth />;
}
