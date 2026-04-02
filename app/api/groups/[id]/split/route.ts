import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const body = await req.json();
    const { label, totalAmount, memberCount } = body;

    if (!label || typeof label !== "string" || label.trim() === "") {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }
    if (typeof totalAmount !== "number" || totalAmount <= 0) {
      return NextResponse.json(
        { error: "totalAmount must be a positive number" },
        { status: 400 }
      );
    }
    if (typeof memberCount !== "number" || memberCount < 1 || !Number.isInteger(memberCount)) {
      return NextResponse.json(
        { error: "memberCount must be a positive integer" },
        { status: 400 }
      );
    }

    // Verify group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const amountPerPerson =
      Math.round((totalAmount / memberCount) * 100) / 100;

    const costSplit = await prisma.costSplit.create({
      data: {
        groupId,
        label: label.trim(),
        totalAmount,
        memberCount,
        amountPerPerson,
      },
      select: {
        id: true,
        label: true,
        totalAmount: true,
        memberCount: true,
        amountPerPerson: true,
      },
    });

    return NextResponse.json(costSplit, { status: 201 });
  } catch (error) {
    console.error("[POST /api/groups/[id]/split]", error);
    return NextResponse.json(
      { error: "Failed to calculate cost split" },
      { status: 500 }
    );
  }
}
