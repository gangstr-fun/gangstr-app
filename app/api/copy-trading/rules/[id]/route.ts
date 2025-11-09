import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CopyTradeRuleUpdateSchema } from "@/lib/copyTrading/schemas";

function getUserWalletAddress(req: NextRequest): string | null {
  const addr = req.headers.get("x-user-wallet-address");
  if (!addr) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  return addr;
}

async function ensureOwnership(id: string, userWalletAddress: string) {
  const rule = await prisma.copyTradeRule.findUnique({ where: { id } });
  if (!rule) return { status: 404 as const, error: "Rule not found" };
  if (rule.userWalletAddress !== userWalletAddress) {
    return { status: 403 as const, error: "Forbidden" };
  }
  return { status: 200 as const, rule };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userWalletAddress = getUserWalletAddress(req);
    if (!userWalletAddress) {
      return NextResponse.json({ error: "Missing or invalid x-user-wallet-address header" }, { status: 401 });
    }

    const { id } = params;
    const result = await ensureOwnership(id, userWalletAddress);
    if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json(result.rule);
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userWalletAddress = getUserWalletAddress(req);
    if (!userWalletAddress) {
      return NextResponse.json({ error: "Missing or invalid x-user-wallet-address header" }, { status: 401 });
    }

    const { id } = params;
    const ownership = await ensureOwnership(id, userWalletAddress);
    if (ownership.status !== 200) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

    const json = await req.json();
    const parsed = CopyTradeRuleUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.copyTradeRule.update({
      where: { id },
      data: {
        ...parsed.data,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userWalletAddress = getUserWalletAddress(req);
    if (!userWalletAddress) {
      return NextResponse.json({ error: "Missing or invalid x-user-wallet-address header" }, { status: 401 });
    }

    const { id } = params;
    const ownership = await ensureOwnership(id, userWalletAddress);
    if (ownership.status !== 200) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

    const deleted = await prisma.copyTradeRule.update({ where: { id }, data: { status: "deleted" } });
    return NextResponse.json(deleted);
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
