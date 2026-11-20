import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sql, mongo } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({routeId:z.number().int().positive(),crowdPercent:z.number().int().min(0).max(100)});
export async function POST(req:NextRequest) {
  const user=await requireAdmin();
  if(!user) return NextResponse.json({error:"Admin login required."},{status:401});
  const parsed=schema.safeParse(await req.json());
  if(!parsed.success) return NextResponse.json({error:"Route ID and crowd percentage (0–100) are required."},{status:400});
  try {
    const db=await sql();
    const conn=await db.getConnection();
    try {
      await conn.beginTransaction();
      const [exists]:any=await conn.query("SELECT id FROM routes WHERE id=? AND active=1 FOR UPDATE",[parsed.data.routeId]);
      if(!exists.length) { await conn.rollback(); return NextResponse.json({error:"Active route not found."},{status:404}); }
      await conn.query("INSERT INTO crowding_summary(route_id,crowd_percent,source) VALUES(?,?,'ADMIN')",[parsed.data.routeId,parsed.data.crowdPercent]);
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
    const database=await mongo();
    await database.collection("crowd_readings").insertOne({
      routeId:parsed.data.routeId,crowdPercent:parsed.data.crowdPercent,
      source:"ADMIN",observedAt:new Date(),updatedBy:user.id
    });
    return NextResponse.json({ok:true,message:"Crowd level updated successfully."});
  } catch(error) {
    console.error(error);
    return NextResponse.json({error:"Could not save crowding reading. Check database connectivity."},{status:503});
  }
}
