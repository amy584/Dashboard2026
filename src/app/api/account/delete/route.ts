import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Hard delete: account + all data (§12). Deleting the auth user cascades to
 * public.users and, via on-delete-cascade FKs, to every owned row. Requires
 * the service-role client (auth admin). Irreversible.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const {
    data: { user: authUser },
  } = await (await createClient()).auth.getUser();
  if (!authUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  // Explicit app-row delete first (covers any FK not set to cascade), then auth.
  await admin.from("users").delete().eq("id", user.id);
  const { error } = await admin.auth.admin.deleteUser(authUser.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
