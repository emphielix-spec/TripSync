import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const members = await prisma.member.findMany({
      where: { groupId },
      select: {
        id: true,
        name: true,
        preferences: { select: { id: true }, take: 1 },
      },
      orderBy: { id: "asc" },
    });

    const result = members.map((m) => ({
      id: m.id,
      name: m.name,
      hasPreferences: m.preferences.length > 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/groups/[id]/members]", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
