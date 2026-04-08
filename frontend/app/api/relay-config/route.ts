import { NextResponse } from 'next/server';

export async function GET() {
  const secret = process.env.ZKAI_RELAY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Relay not configured' }, { status: 503 });
  }
  return NextResponse.json({
    relay_url: 'https://zkai-relay.fly.dev',
    relay_secret: secret,
    auth_url: 'https://zkai.vercel.app',
    price_per_request: 100,
  });
}
