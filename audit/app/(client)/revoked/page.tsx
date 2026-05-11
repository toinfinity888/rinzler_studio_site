import { Card, CardHeader } from "@/components/ui/Card";
import Link from "next/link";

export const metadata = {
  title: "Lien expiré · Rinzler Studio",
  robots: { index: false, follow: false },
};

export default function RevokedPage() {
  return (
    <Card>
      <CardHeader
        title="Ce lien n'est plus actif"
        description="Ce lien d'audit n'est pas (ou plus) accessible. Veuillez contacter votre consultant Rinzler Studio."
      />
      <Link
        href="https://rinzlerstudio.fr"
        className="text-sm text-accent-cyan underline hover:text-accent-cyan-hover"
      >
        rinzlerstudio.fr
      </Link>
    </Card>
  );
}
