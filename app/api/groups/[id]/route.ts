import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const group = await prisma.group.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, inviteCode: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json(group);
  } catch (error) {
    console.error("[GET /api/groups/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}
