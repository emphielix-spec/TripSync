import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MOCK_PLAN = (destination: string) => `
## ✈️ Getting There

**Best options to ${destination}:**

- **Ryanair / EasyJet** — Direct flights from Amsterdam Schiphol, typically €60–120 per person return. Book 6–8 weeks ahead for best prices.
  - [Search on Skyscanner](https://www.skyscanner.net) | [Google Flights](https://www.google.com/flights)
- **Flixbus** — If ${destination} is reachable overland, budget €25–45 each way.
- **Tip:** Flying midweek (Tuesday/Wednesday) is usually 20–30% cheaper.

---

## 🏨 Where to Stay

**Budget — Hostel / Shared apartment (~€25–40/night per person)**
- *Sun Beach Hostel* — Centrally located, great social vibe, free breakfast. [Booking.com](https://www.booking.com) | [Hostelworld](https://www.hostelworld.com)

**Mid-range — Boutique hotel (~€60–100/night per person)**
- *Hotel Aurora* — Rooftop pool, 10 min from the beach, highly rated for groups. [Booking.com](https://www.booking.com)

**Premium — Private villa / Airbnb (~€120–180/night per person)**
- Rent an entire villa for the group — private pool, kitchen, and much better value split across everyone. [Airbnb](https://www.airbnb.com)

---

## 🗺️ Day by Day Itinerary

**Day 1 — Arrival & Explore**
Arrive, check in, grab dinner at a local tapas bar near the centre. Evening stroll along the waterfront.

**Day 2 — Beach Day**
Full day at the main beach. Rent sun loungers (€5–8 each). Lunch at a beachside restaurant, evening cocktails at a rooftop bar.

**Day 3 — Culture & Sightseeing**
Morning: Old town walking tour (free or €12 guided). Afternoon: Visit the local market. Evening: Group dinner at a highly rated local restaurant.

**Day 4 — Day Trip**
Rent a car or join a group tour to a nearby scenic spot (mountains, hidden cove, or historic village). €20–40 per person.

**Day 5 — Activities Day**
Water sports or hiking in the morning. Spa/relax in the afternoon. Farewell dinner at a rooftop restaurant.

**Day 6 — Departure**
Morning swim, late checkout, head to the airport.

---

## 🎯 Top Activities

1. **Boat trip / sailing day** — See the coastline from the water. €35–55/person. [Viator](https://www.viator.com)
2. **Cooking class** — Learn local dishes together. €45–65/person. [GetYourGuide](https://www.getyourguide.com)
3. **Hiking** — Coastal or mountain trails, most are free or €5 with a guide.
4. **Kayaking / paddleboarding** — €15–25 for a half day rental.
5. **Pub crawl / bar hopping** — Organised tours are great for nightlife, €15–25 including entrance fees.

---

## 💰 Budget Breakdown Per Person

| Item | Budget | Mid-range | Premium |
|------|--------|-----------|---------|
| Flights (return) | €60 | €100 | €160 |
| Accommodation (5 nights) | €125 | €250 | €450 |
| Food & drink | €120 | €200 | €300 |
| Activities | €60 | €100 | €160 |
| Local transport | €20 | €40 | €60 |
| **Total** | **€385** | **€690** | **€1,130** |

---

## 🔗 Quick Booking Links

- ✈️ **Flights:** [Skyscanner](https://www.skyscanner.net) · [Google Flights](https://www.google.com/flights) · [Ryanair](https://www.ryanair.com)
- 🏨 **Hotels:** [Booking.com](https://www.booking.com) · [Airbnb](https://www.airbnb.com) · [Hostelworld](https://www.hostelworld.com)
- 🎟️ **Activities:** [Viator](https://www.viator.com) · [GetYourGuide](https://www.getyourguide.com)
- 🚌 **Bus:** [Flixbus](https://www.flixbus.com)
`;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const groupId = params.id;

  try {
    const body = await req.json();
    const { destinationName, destinationCountry } = body as {
      destinationName: string;
      destinationCountry: string;
    };

    if (!destinationName || !destinationCountry) {
      return NextResponse.json(
        { error: "destinationName and destinationCountry are required" },
        { status: 400 }
      );
    }

    // ── Fetch group preferences ─────────────────────────────────────
    const preferences = await prisma.preference.findMany({
      where: { groupId },
      include: { member: { select: { name: true } } },
    });

    if (preferences.length === 0) {
      return NextResponse.json(
        { error: "No preferences found for this group" },
        { status: 400 }
      );
    }

    const memberCount = preferences.length;
    const avgBudget = Math.round(
      preferences.reduce((s, p) => s + (p.budgetMin + p.budgetMax) / 2, 0) / memberCount
    );
    const avgDuration = Math.round(
      preferences.reduce((s, p) => s + p.tripDurationDays, 0) / memberCount
    );

    // Earliest from-date and latest to-date across the group
    const departureDates = preferences.map((p) => new Date(p.departureDateFrom));
    const returnDates = preferences.map((p) => new Date(p.departureDateTo));
    const earliestDeparture = new Date(Math.min(...departureDates.map((d) => d.getTime())));
    const latestReturn = new Date(Math.max(...returnDates.map((d) => d.getTime())));
    const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    // Most common vibe
    const vibeCounts: Record<string, number> = {};
    for (const p of preferences) vibeCounts[p.vibe] = (vibeCounts[p.vibe] ?? 0) + 1;
    const mostCommonVibe = Object.entries(vibeCounts).sort((a, b) => b[1] - a[1])[0][0];

    // Boolean majority flags
    const majority = (key: keyof typeof preferences[0]) =>
      preferences.filter((p) => p[key] === true).length > memberCount / 2 ? "Yes" : "No";

    // ── MOCK mode ───────────────────────────────────────────────────
    if (process.env.MOCK_AI === "true") {
      const content = MOCK_PLAN(destinationName);
      await prisma.tripPlan.create({
        data: { groupId, destination: `${destinationName}, ${destinationCountry}`, content },
      });
      return NextResponse.json({ content });
    }

    // ── Build prompt ────────────────────────────────────────────────
    const prompt = `Plan a complete group holiday to ${destinationName}, ${destinationCountry}.

Group details:
- Number of people: ${memberCount}
- Budget per person: €${avgBudget}
- Travel dates: ${fmtDate(earliestDeparture)} to ${fmtDate(latestReturn)}
- Trip duration: ${avgDuration} days
- Group vibe: ${mostCommonVibe}
- Wants beach: ${majority("wantsBeach")}
- Wants nightlife: ${majority("wantsNightlife")}
- Wants outdoor activities: ${majority("wantsOutdoor")}
- Warm weather important: ${majority("wantsWarmWeather")}
- Budget is priority: ${majority("budgetPriority")}

Search the web and return a complete trip plan with these sections:

## ✈️ Getting There
Best flight and transport options from the Netherlands to ${destinationName}. Include airlines, realistic prices, and links to Skyscanner and Google Flights. Check Flixbus if the destination is reachable by bus.

## 🏨 Where to Stay
3 accommodation options (budget / mid-range / premium) for a group of ${memberCount}. Include real names, nightly prices, and links to Booking.com and Airbnb.

## 🗺️ Day by Day Itinerary
Full day-by-day plan for ${avgDuration} days. Specific real places, restaurants, beaches, and experiences.

## 🎯 Top Activities
5 best things to do in ${destinationName} with prices and links to Viator or GetYourGuide where relevant.

## 💰 Budget Breakdown Per Person
- Flights: €X
- Accommodation: €X
- Food & drink: €X per day
- Activities: €X
- Local transport: €X
- Total estimated: €X

## 🔗 Quick Booking Links
Direct links for flights, hotels, and activities.`;

    // ── Call Claude API with web search ─────────────────────────────
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `You are an expert travel planner helping friend groups plan amazing holidays together. Use web search to find real, current information. Always include specific real place names, realistic prices, and actual booking links. Format everything in clean markdown.`,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[plan API] Claude error:", err);
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }

    const aiData = await response.json();

    // Extract text blocks from the response (skip tool_use blocks)
    const content = (aiData.content as { type: string; text?: string }[])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n\n");

    // ── Save to DB ──────────────────────────────────────────────────
    await prisma.tripPlan.create({
      data: { groupId, destination: `${destinationName}, ${destinationCountry}`, content },
    });

    return NextResponse.json({ content });
  } catch (error) {
    console.error("[POST /api/groups/[id]/plan]", error);
    return NextResponse.json({ error: "Failed to generate trip plan" }, { status: 500 });
  }
}

// GET — load the latest saved plan for a destination
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const groupId = params.id;
  const destination = req.nextUrl.searchParams.get("destination");

  try {
    const plan = await prisma.tripPlan.findFirst({
      where: { groupId, ...(destination ? { destination } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(plan ?? null);
  } catch (error) {
    console.error("[GET /api/groups/[id]/plan]", error);
    return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });
  }
}
