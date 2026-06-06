import { AuthForm } from "@/components/AuthForm";

// Rendered on demand: the form builds a Supabase browser client, so we skip
// static prerendering (which has no runtime env).
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <AuthForm mode="sign-in" />;
}
