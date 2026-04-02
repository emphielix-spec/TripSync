import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface DestinationSuggestion {
  name: string;
  country: string;
  reasoning: string;
  score: number;
}

const MOCK_DESTINATIONS_POOL: DestinationSuggestion[] = [
  {
    name: "Barcelona",
    country: "Spain",
    reasoning:
      "A perfect mix of beach and city life with vibrant nightlife, world-class food, and warm weather. Sagrada Família, tapas crawls, and the beach all within reach.",
    score: 9.2,
  },
  {
    name: "Lisbon",
    country: "Portugal",
    reasoning:
      "One of Europe's most affordable yet beautiful capitals. Great food scene, stunning viewpoints, and easy flight connections across the continent.",
    score: 8.7,
  },
  {
    name: "Split",
    country: "Croatia",
    reasoning:
      "Stunning Adriatic coastline, crystal-clear water, a lively UNESCO-listed old town, and great value for money. Ideal for a group summer trip.",
    score: 8.1,
  },
  {
    name: "Amsterdam",
    country: "Netherlands",
    reasoning:
      "World-class museums, iconic canal cycling, and a buzzing nightlife scene. The city is compact enough to explore fully in a long weekend.",
    score: 8.5,
  },
  {
    name: "Prague",
    country: "Czech Republic",
    reasoning:
      "A fairy-tale medieval old town, legendary craft beer culture, and some of the lowest prices in Europe. Hard to beat for groups on a budget.",
    score: 8.9,
  },
  {
    name: "Dubrovnik",
    country: "Croatia",
    reasoning:
      "The 'Pearl of the Adriatic' offers dramatic city walls, crystal-blue waters, and a buzzing old town. Perfect for groups who want culture and beach in one.",
    score: 8.3,
  },
  {
    name: "Rome",
    country: "Italy",
    reasoning:
      "Eternal history at every corner — the Colosseum, Vatican, and world-famous cuisine make it unforgettable. A bucket-list city that suits every travel style.",
    score: 9.0,
  },
  {
    name: "Athens",
    country: "Greece",
    reasoning:
      "Ancient ruins, rooftop bars with Acropolis views, and exceptional food at very reasonable prices. A city that rewards curious, food-loving travellers.",
    score: 8.4,
  },
  {
    name: "Porto",
    country: "Portugal",
    reasoning:
      "Stunning riverside architecture, world-famous wine cellars, and a thriving food and arts scene. One of Europe's most charming and affordable cities.",
    score: 8.6,
  },
  {
    name: "Santorini",
    country: "Greece",
    reasoning:
      "Iconic whitewashed villages, volcanic beaches, and spectacular Aegean sunsets. The quintessential Mediterranean island experience for any group.",
    score: 9.1,
  },
  {
    name: "Vienna",
    country: "Austria",
    reasoning:
      "Imperial palaces, world-class coffee houses, and a rich cultural scene. Vienna blends old-world elegance with a lively modern nightlife.",
    score: 8.7,
  },
  {
    name: "Budapest",
    country: "Hungary",
    reasoning:
      "Thermal baths, ruin bars, and a dramatic riverside skyline at budget-friendly prices. Budapest is a hugely popular destination for group trips.",
    score: 9.0,
  },
  {
    name: "Amalfi Coast",
    country: "Italy",
    reasoning:
      "Dramatic cliffs, turquoise sea, and charming clifftop villages. A scenic road-trip destination that feels like a postcard come to life.",
    score: 8.8,
  },
  {
    name: "Mykonos",
    country: "Greece",
    reasoning:
      "Famous beaches, world-class DJs, and a vibrant cosmopolitan atmosphere. The go-to Greek island for groups who want sun, sea, and nightlife.",
    score: 8.6,
  },
  {
    name: "Valletta",
    country: "Malta",
    reasoning:
      "Europe's smallest capital packs in incredible Baroque architecture, clear diving waters, and a surprisingly lively bar scene. Flights from most of Europe are cheap.",
    score: 8.2,
  },
  {
    name: "Reykjavik",
    country: "Iceland",
    reasoning:
      "Aurora borealis, geothermal hot springs, and dramatic volcanic landscapes make this the ultimate adventure destination for a group seeking something unforgettable.",
    score: 8.9,
  },
  {
    name: "Copenhagen",
    country: "Denmark",
    reasoning:
      "Innovative food scene (home of Noma), beautiful waterfront, and effortless Scandinavian cool. Perfect for food-loving, design-minded groups.",
    score: 8.5,
  },
  {
    name: "Palma de Mallorca",
    country: "Spain",
    reasoning:
      "Beautiful beaches, a stunning Gothic cathedral, and a lively tapas scene. Mallorca works equally well for beach lovers and culture seekers.",
    score: 8.4,
  },
  {
    name: "Florence",
    country: "Italy",
    reasoning:
      "The birthplace of the Renaissance — Michelangelo's David, the Uffizi Gallery, and arguably the world's finest food market all in one walkable city.",
    score: 8.8,
  },
  {
    name: "Krakow",
    country: "Poland",
    reasoning:
      "A beautifully preserved medieval old town, lively nightlife, and some of the cheapest prices in Europe. Great for groups who want history, food, and fun.",
    score: 8.7,
  },
];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const isMockMode = process.env.MOCK_AI === "true";
    console.log("[/match] START groupId:", groupId, "| mockMode:", isMockMode);

    // Verify group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Fetch all preferences for this group
    const preferences = await prisma.preference.findMany({
      where: { groupId },
      include: { member: { select: { name: true } } },
    });
    console.log("[/match] preferences count:", preferences.length);

    if (preferences.length < 2) {
      return NextResponse.json(
        { error: "Not enough preferences yet" },
        { status: 400 }
      );
    }

    // ── Clear any previous destinations (and their votes) for this group ──
    const existingDestinations = await prisma.destination.findMany({
      where: { groupId },
      select: { id: true },
    });
    if (existingDestinations.length > 0) {
      const destIds = existingDestinations.map((d) => d.id);
      await prisma.vote.deleteMany({ where: { destinationId: { in: destIds } } });
      await prisma.destination.deleteMany({ where: { groupId } });
      console.log("[/match] Cleared", existingDestinations.length, "existing destinations");
    }

    // ── Mock mode: skip Claude entirely ──────────────────────────
    let suggestions: DestinationSuggestion[];

    if (isMockMode) {
      console.log("[/match] MOCK MODE — returning fake destinations, skipping Claude API");
      // Randomly pick 3 from the pool so each call gives a fresh selection
      suggestions = [...MOCK_DESTINATIONS_POOL]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
    } else {
      // ── Real mode: call Claude API ──────────────────────────────
      const memberLines = preferences
        .map(
          (p) =>
            `- ${p.member.name}: Budget €${p.budgetMin}–€${p.budgetMax}, travel month: ${p.travelMonth}, trip length: ${p.tripDurationDays} days, vibe preference: ${p.vibe}`
        )
        .join("\n");

      const userMessage = `A group of ${preferences.length} friends are planning a trip together. Here are their individual preferences:

${memberLines}

Based on these preferences, suggest the 3 best destinations for this group. For each destination return:
- name (city or region)
- country
- reasoning (2-3 sentences explaining why it fits the group)
- score (a float from 0.0 to 10.0 indicating how well it fits)

Respond ONLY with a JSON array in this format:
[
  { "name": "...", "country": "...", "reasoning": "...", "score": 8.4 },
  ...
]`;

      console.log("[/match] Calling Claude API…");

      let message;
      try {
        message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system:
            "You are a travel expert helping a friend group decide on a trip destination. You will receive each group member's preferences and must suggest the 3 best destinations that balance everyone's needs. Always return valid JSON only — no extra text.",
          messages: [{ role: "user", content: userMessage }],
        });
        console.log("[/match] Claude API response received, stop_reason:", message.stop_reason);
      } catch (apiError: unknown) {
        console.error("[/match] Claude API call FAILED:", apiError);
        if (apiError instanceof Error) {
          const anthropicMsg = (() => {
            try {
              const match = apiError.message.match(/"message":"([^"]+)"/);
              return match ? match[1] : null;
            } catch { return null; }
          })();
          if (anthropicMsg) {
            return NextResponse.json(
              { error: `Anthropic API error: ${anthropicMsg}` },
              { status: 502 }
            );
          }
        }
        throw apiError;
      }

      const textBlock = message.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return NextResponse.json(
          { error: "Unexpected response format from AI" },
          { status: 500 }
        );
      }

      console.log("[/match] Raw AI response:", textBlock.text);

      try {
        const raw = textBlock.text.trim();
        const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        suggestions = JSON.parse(jsonText);
        console.log("[/match] Parsed suggestions count:", suggestions.length);
      } catch (parseError) {
        console.error("[/match] JSON parse FAILED:", parseError);
        console.error("[/match] Raw text:", textBlock.text);
        return NextResponse.json(
          { error: "Failed to parse AI destination suggestions" },
          { status: 500 }
        );
      }

      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        return NextResponse.json(
          { error: "AI returned no destination suggestions" },
          { status: 500 }
        );
      }
    }

    // ── Save to DB (same path for both real and mock) ─────────────
    console.log("[/match] Saving", Math.min(suggestions.length, 3), "destinations to DB");

    const destinations = await Promise.all(
      suggestions.slice(0, 3).map((s) =>
        prisma.destination.create({
          data: {
            groupId,
            name: s.name,
            country: s.country,
            reasoning: s.reasoning,
            score: Number(s.score),
          },
          select: {
            id: true,
            name: true,
            country: true,
            reasoning: true,
            score: true,
          },
        })
      )
    );

    console.log("[/match] SUCCESS — saved:", destinations.map((d) => d.name));
    return NextResponse.json(destinations, { status: 201 });
  } catch (error) {
    console.error("[POST /api/groups/[id]/match] UNHANDLED ERROR:", error);
    if (error instanceof Error) {
      console.error("[/match] error.message:", error.message);
    }
    return NextResponse.json(
      { error: "Failed to generate destination matches" },
      { status: 500 }
    );
  }
}
