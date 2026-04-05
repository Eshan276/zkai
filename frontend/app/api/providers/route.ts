import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET() {
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT id, endpoint, model, price, reputation
      FROM providers
      WHERE active = TRUE
      ORDER BY reputation DESC
    `;
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}
