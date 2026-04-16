import { NextRequest, NextResponse } from "next/server";

const LIBERAPAY_TEAM = "breachlab";

type LiberapayPublicData = {
  npatrons: number;
  receiving: { amount: string; currency: string };
};

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`https://liberapay.com/${LIBERAPAY_TEAM}/public.json`);
    if (!res.ok) {
      return NextResponse.json({ error: "liberapay api error", status: res.status }, { status: 502 });
    }
    const data = (await res.json()) as LiberapayPublicData;

    return NextResponse.json({
      ok: true,
      npatrons: data.npatrons,
      receiving: data.receiving,
      note: "Liberapay does not expose individual patron data. Patrons must self-register or be added manually.",
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
