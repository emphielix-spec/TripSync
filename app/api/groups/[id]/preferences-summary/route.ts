import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const QUESTION_LABELS: Record<string, string> = {
  wantsBeach:        "Beach holiday",
  wantsNightlife:    "Nightlife / going out",
  okLongFlights:     "Okay with long flights (4h+)",
  wantsOutdoor:      "Outdoor activities",
  prefersCity:       "Prefers city over nature",
  budgetPriority:    "Budget is top priority",
  wantsRoadTrip:     "Open to road trip",
  wantsWarmWeather:  "Wants warm weather (25°C+)",
  openToOffbeat:     "Open to less touristy spots",
  wantsAllInclusive: "All-inclusive / resort",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const preferences = await prisma.preference.findMany({
      where: { groupId },
      include: { member: { select: { name: true } } },
      orderBy: { id: "asc" },
    });

    const summary = preferences.map((p) => ({
      memberName: p.member.name,
      budgetMin: p.budgetMin,
      budgetMax: p.budgetMax,
      departureDateFrom: p.departureDateFrom,
      departureDateTo: p.departureDateTo,
      tripDurationDays: p.tripDurationDays,
      vibe: p.vibe,
      questions: Object.entries(QUESTION_LABELS).map(([key, label]) => ({
        key,
        label,
        answer: p[key as keyof typeof p] as boolean,
      })),
    }));

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[GET /api/groups/[id]/preferences-summary]", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences summary" },
      { status: 500 }
    );
  }
}
