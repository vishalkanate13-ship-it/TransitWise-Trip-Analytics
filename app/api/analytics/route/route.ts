import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
export const runtime="nodejs";
export async function GET() {
  const user=await getSession();
  if(!user || user.role!=="ADMIN") return NextResponse.json({error:"Admin access required."},{status:401});
  try {
    const db=await sql();
    const [rows]=await db.query("CALL GetRoutePopularity()");
    return NextResponse.json({analytics:(rows as any)[0]});
  } catch(error) { console.error(error); return NextResponse.json({error:"Analytics unavailable."},{status:503}); }
}
