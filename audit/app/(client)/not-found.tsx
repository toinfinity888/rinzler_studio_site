import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";

/**
 * Generic "no longer active" page. Used for: revoked tokens, never-existed
 * tokens, and any other miss in the tokenized client routes (FR-006). The
 * copy MUST NOT distinguish between cases — no enumeration leak.
 */
export default function ClientNotFound() {
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
