import { AuthForm } from "@/components/AuthForm";

// See sign-in: skip static prerender so the browser client isn't built at build time.
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return <AuthForm mode="sign-up" />;
}
