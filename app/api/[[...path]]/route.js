import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'GymOS API online', version: '1.0.0' })
}

export async function POST() {
  return NextResponse.json({ ok: true })
}
