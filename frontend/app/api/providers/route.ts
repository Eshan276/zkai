import { NextResponse } from 'next/server';

const BRIDGE_URL = (process.env.ZKAI_BRIDGE_URL ?? 'http://localhost:7300').replace(/\/$/, '');

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/providers`, { next: { revalidate: 30 } });
    if (!res.ok) return NextResponse.json([]);
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([]);
  }
}
