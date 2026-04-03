import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_VIBES = ["BEACH", "CITY", "NATURE", "PARTY", "CULTURE", "ADVENTURE"];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const body = await req.json();

    const {
      memberId,
      budgetMin,
      budgetMax,
      departureDateFrom,
      departureDateTo,
      tripDurationDays,
      vibe,
      // Yes/No questions
      wantsBeach,
      wantsNightlife,
      okLongFlights,
      wantsOutdoor,
      prefersCity,
      budgetPriority,
      wantsRoadTrip,
      wantsWarmWeather,
      openToOffbeat,
      wantsAllInclusive,
    } = body;

    if (!memberId || typeof memberId !== "string") {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }
    if (typeof budgetMin !== "number" || typeof budgetMax !== "number") {
      return NextResponse.json(
        { error: "budgetMin and budgetMax must be numbers" },
        { status: 400 }
      );
    }
    if (budgetMin >= budgetMax) {
      return NextResponse.json(
        { error: "budgetMin must be less than budgetMax" },
        { status: 400 }
      );
    }
    if (!departureDateFrom || !departureDateTo) {
      return NextResponse.json(
        { error: "departureDateFrom and departureDateTo are required" },
        { status: 400 }
      );
    }
    const dateFrom = new Date(departureDateFrom);
    const dateTo = new Date(departureDateTo);
    if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (dateFrom > dateTo) {
      return NextResponse.json(
        { error: "departureDateFrom must be before departureDateTo" },
        { status: 400 }
      );
    }
    if (typeof tripDurationDays !== "number" || tripDurationDays < 1) {
      return NextResponse.json(
        { error: "tripDurationDays must be a positive integer" },
        { status: 400 }
      );
    }
    if (!vibe || !VALID_VIBES.includes(vibe)) {
      return NextResponse.json(
        { error: `vibe must be one of: ${VALID_VIBES.join(", ")}` },
        { status: 400 }
      );
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, groupId },
    });
    if (!member) {
      return NextResponse.json(
        { error: "Member not found in this group" },
        { status: 404 }
      );
    }

    // Remove any existing preference for this member so re-submitting doesn't create duplicates
    await prisma.preference.deleteMany({ where: { memberId, groupId } });

    const preference = await prisma.preference.create({
      data: {
        memberId,
        groupId,
        budgetMin: Math.floor(budgetMin),
        budgetMax: Math.floor(budgetMax),
        departureDateFrom: dateFrom,
        departureDateTo: dateTo,
        tripDurationDays: Math.floor(tripDurationDays),
        vibe,
        wantsBeach: Boolean(wantsBeach),
        wantsNightlife: Boolean(wantsNightlife),
        okLongFlights: Boolean(okLongFlights),
        wantsOutdoor: Boolean(wantsOutdoor),
        prefersCity: Boolean(prefersCity),
        budgetPriority: Boolean(budgetPriority),
        wantsRoadTrip: Boolean(wantsRoadTrip),
        wantsWarmWeather: Boolean(wantsWarmWeather),
        openToOffbeat: Boolean(openToOffbeat),
        wantsAllInclusive: Boolean(wantsAllInclusive),
      },
    });

    return NextResponse.json(preference, { status: 201 });
  } catch (error) {
    console.error("[POST /api/groups/[id]/preferences]", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
