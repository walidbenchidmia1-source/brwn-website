import { createClient } from "@/utils/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Sign out from Supabase Auth (clears server-side and client-side cookies)
  await supabase.auth.signOut();

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url, { status: 302 });
}
