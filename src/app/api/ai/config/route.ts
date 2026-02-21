import { NextResponse } from "next/server";

export async function GET() {
  const hasApiKey = !!process.env.NEXT_PUBLIC_GROQ_API_KEY;
  
  return NextResponse.json({
    configured: hasApiKey,
  });
}
