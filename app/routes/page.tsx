import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import RoutePlanner from "./route-planner";

export default async function RoutesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "PASSENGER") redirect("/admin");
  return <RoutePlanner passengerName={session.name} />;
}
