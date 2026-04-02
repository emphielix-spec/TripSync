import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const body = await req.json();
    const { memberId, destinationId, value } = body;

    if (!memberId || typeof memberId !== "string") {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }
    if (!destinationId || typeof destinationId !== "string") {
      return NextResponse.json(
        { error: "destinationId is required" },
        { status: 400 }
      );
    }
    if (value !== "UP" && value !== "DOWN") {
      return NextResponse.json(
        { error: 'value must be "UP" or "DOWN"' },
        { status: 400 }
      );
    }

    // Verify group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Verify member belongs to this group
    const member = await prisma.member.findFirst({
      where: { id: memberId, groupId },
    });
    if (!member) {
      return NextResponse.json(
        { error: "Member not found in this group" },
        { status: 404 }
      );
    }

    // Verify destination belongs to this group
    const destination = await prisma.destination.findFirst({
      where: { id: destinationId, groupId },
    });
    if (!destination) {
      return NextResponse.json(
        { error: "Destination not found in this group" },
        { status: 404 }
      );
    }

    // Upsert vote (one vote per member per destination)
    await prisma.vote.upsert({
      where: { memberId_destinationId: { memberId, destinationId } },
      create: { memberId, destinationId, value },
      update: { value },
    });

    // Return updated vote counts for this destination
    const [upvotes, downvotes] = await Promise.all([
      prisma.vote.count({ where: { destinationId, value: "UP" } }),
      prisma.vote.count({ where: { destinationId, value: "DOWN" } }),
    ]);

    return NextResponse.json({ destinationId, upvotes, downvotes });
  } catch (error) {
    console.error("[POST /api/groups/[id]/vote]", error);
    return NextResponse.json(
      { error: "Failed to cast vote" },
      { status: 500 }
    );
  }
}
