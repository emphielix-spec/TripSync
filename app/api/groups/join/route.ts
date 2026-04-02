import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inviteCode, memberName } = body;

    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json(
        { error: "inviteCode is required" },
        { status: 400 }
      );
    }

    if (!memberName || typeof memberName !== "string" || memberName.trim() === "") {
      return NextResponse.json(
        { error: "memberName is required" },
        { status: 400 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found. Check your invite code." },
        { status: 404 }
      );
    }

    const member = await prisma.member.create({
      data: {
        name: memberName.trim(),
        groupId: group.id,
      },
      select: {
        id: true,
        groupId: true,
      },
    });

    return NextResponse.json(
      {
        memberId: member.id,
        groupId: member.groupId,
        groupName: group.name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/groups/join]", error);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 }
    );
  }
}
