import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;

    // Verify group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Fetch all destinations with vote counts
    const destinations = await prisma.destination.findMany({
      where: { groupId },
      include: {
        votes: { select: { value: true } },
      },
    });

    // Compute vote tallies and sort by (upvotes - downvotes) descending
    const results = destinations
      .map((d) => {
        const upvotes = d.votes.filter((v) => v.value === "UP").length;
        const downvotes = d.votes.filter((v) => v.value === "DOWN").length;
        return {
          id: d.id,
          name: d.name,
          country: d.country,
          reasoning: d.reasoning,
          score: d.score,
          createdAt: d.createdAt,
          upvotes,
          downvotes,
        };
      })
      .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));

    return NextResponse.json(results);
  } catch (error) {
    console.error("[GET /api/groups/[id]/results]", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
