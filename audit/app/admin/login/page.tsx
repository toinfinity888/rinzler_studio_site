import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, auth } from "@/lib/auth/config";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, FieldLabel } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/brand/GradientText";

export const metadata = {
  title: "Connexion · Rinzler Audit",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin/projects");
  try {
    await signIn("credentials", { email, password, redirectTo: next });
  } catch (err) {
    // Auth.js throws CredentialsSignin (an AuthError) when authorize() returns
    // null. Bounce back to the login page with ?error=invalid so the form
    // shows the generic message — never disambiguate user-vs-password.
    if (err instanceof AuthError) {
      const params = new URLSearchParams({ error: "invalid", next });
      redirect(`/admin/login?${params.toString()}`);
    }
    // Re-throw redirect errors (signIn signals success via redirect) and any
    // genuine bug so it surfaces in dev rather than getting swallowed.
    throw err;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = await searchParams;
  if (session?.user) {
    redirect(params.next ?? "/admin/projects");
  }
  return (
    <div className="min-h-dvh flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader
          title={<GradientText>Connexion consultant</GradientText>}
          description="Plateforme d'audit privée Rinzler Studio."
        />
        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="next" value={params.next ?? "/admin/projects"} />
          <div className="space-y-1.5">
            <FieldLabel htmlFor="email" required>
              Email
            </FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="password" required>
              Mot de passe
            </FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {params.error ? (
            <p role="alert" className="text-sm text-error">
              Identifiants invalides.
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            Se connecter
          </Button>
        </form>
      </Card>
    </div>
  );
}

