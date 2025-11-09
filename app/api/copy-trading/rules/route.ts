import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CopyTradeRuleCreateSchema,
} from "@/lib/copyTrading/schemas";

function getUserWalletAddress(req: NextRequest): string | null {
  const addr = req.headers.get("x-user-wallet-address");
  if (!addr) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  return addr;
}

export async function POST(req: NextRequest) {
  try {
    const userWalletAddress = getUserWalletAddress(req);
    if (!userWalletAddress) {
      return NextResponse.json({ error: "Missing or invalid x-user-wallet-address header" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = CopyTradeRuleCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { sources, condition, buySpec, sellSpec, riskGuardrails, metadata } = parsed.data;

    const created = await prisma.copyTradeRule.create({
      data: {
        userWalletAddress,
        status: "active",
        sources,
        condition,
        buySpec,
        sellSpec: sellSpec ?? null,
        riskGuardrails: riskGuardrails ?? null,
        metadata: metadata ?? null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userWalletAddress = getUserWalletAddress(req);
    if (!userWalletAddress) {
      return NextResponse.json({ error: "Missing or invalid x-user-wallet-address header" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const rules = await prisma.copyTradeRule.findMany({
      where: {
        userWalletAddress,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rules);
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
