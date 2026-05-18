import "server-only";

import * as cheerio from "cheerio";

/**
 * DOM extractors (T035).
 *
 * Static-HTML signal extraction via Cheerio (server-side). Run against the
 * rendered DOM string captured by Playwright. Cheerio is intentionally NOT
 * a browser — these checks must not depend on layout, only structural
 * presence.
 *
 * Signals surfaced (a starter set; the scanner can produce additional rows
 * via the lighthouse-runner and the fingerprint matcher):
 *  - JSON-LD schema.org types and Hotel-entity clarity.
 *  - FAQ presence (heuristic).
 *  - WhatsApp / Messenger / phone:tel: visibility.
 *  - hreflang map (multilingual structure).
 *  - OG tags (basic SEO presence).
 *  - Booking-button target (href, external-domain flag).
 *  - Contact-page detection.
 */

export interface DomSignals {
  schemaJsonLd: unknown[];
  schemaHotelPresent: boolean;
  faqHeuristicMatched: boolean;
  whatsappLinkCount: number;
  messengerLinkCount: number;
  telLinkCount: number;
  hreflangLanguages: string[];
  ogTags: Record<string, string>;
  bookingButtonHref: string | null;
  bookingButtonExternalDomain: boolean;
  contactPageDetected: boolean;
  /** Distinct script `src` values — passed to the vendor fingerprinter. */
  scriptSrcs: string[];
  /** Distinct iframe `src` values. */
  iframeSrcs: string[];
  /** All visible anchor `href` values. */
  anchorHrefs: string[];
}

const BOOKING_KEYWORDS = [
  "book",
  "reserver",
  "réserver",
  "reservation",
  "réservation",
  "buchen",
  "prenota",
];

export function extractDomSignals(html: string, pageUrl: string): DomSignals {
  const $ = cheerio.load(html);

  // JSON-LD blocks.
  const schemaJsonLd: unknown[] = [];
  $("script[type='application/ld+json']").each((_, el) => {
    const raw = $(el).contents().text();
    try {
      schemaJsonLd.push(JSON.parse(raw));
    } catch {
      /* malformed JSON-LD — skip */
    }
  });
  const schemaHotelPresent = schemaJsonLd.some((node) => {
    const types = collectSchemaTypes(node);
    return types.some((t) => /Hotel|LodgingBusiness|BedAndBreakfast/i.test(t));
  });

  // FAQ heuristic: any FAQPage in schema OR an FAQ heading.
  const faqInSchema = schemaJsonLd.some((node) =>
    collectSchemaTypes(node).some((t) => /FAQPage/i.test(t)),
  );
  const faqInHeading = $("h1,h2,h3").toArray().some((el) =>
    /(faq|questions fréquentes|frequently asked)/i.test($(el).text()),
  );
  const faqHeuristicMatched = faqInSchema || faqInHeading;

  // Communication channels.
  const anchorHrefs: string[] = [];
  let whatsappLinkCount = 0;
  let messengerLinkCount = 0;
  let telLinkCount = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    anchorHrefs.push(href);
    if (/wa\.me|api\.whatsapp\.com\/send/i.test(href)) whatsappLinkCount++;
    if (/m\.me\//i.test(href)) messengerLinkCount++;
    if (/^tel:/i.test(href)) telLinkCount++;
  });

  // Hreflang.
  const hreflangLanguages = Array.from(
    new Set(
      $("link[rel='alternate'][hreflang]")
        .toArray()
        .map((el) => $(el).attr("hreflang") ?? "")
        .filter(Boolean),
    ),
  );

  // OG tags.
  const ogTags: Record<string, string> = {};
  $("meta[property^='og:']").each((_, el) => {
    const property = $(el).attr("property") ?? "";
    const content = $(el).attr("content") ?? "";
    if (property && content) ogTags[property] = content;
  });

  // Booking-button heuristic.
  const origin = safeOrigin(pageUrl);
  let bookingButtonHref: string | null = null;
  $("a,button").each((_, el) => {
    if (bookingButtonHref) return;
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr("href") ?? "";
    if (text && BOOKING_KEYWORDS.some((kw) => text.includes(kw))) {
      bookingButtonHref = href || null;
    }
  });
  const bookingButtonExternalDomain =
    !!bookingButtonHref &&
    /^https?:\/\//i.test(bookingButtonHref) &&
    safeOrigin(bookingButtonHref) !== origin;

  // Contact-page presence.
  const contactPageDetected = anchorHrefs.some((href) =>
    /\/contact|\/contacto|\/kontakt|\/contactez/i.test(href),
  );

  // Script + iframe srcs (for fingerprinter).
  const scriptSrcs = Array.from(
    new Set(
      $("script[src]")
        .toArray()
        .map((el) => $(el).attr("src") ?? "")
        .filter(Boolean),
    ),
  );
  const iframeSrcs = Array.from(
    new Set(
      $("iframe[src]")
        .toArray()
        .map((el) => $(el).attr("src") ?? "")
        .filter(Boolean),
    ),
  );

  return {
    schemaJsonLd,
    schemaHotelPresent,
    faqHeuristicMatched,
    whatsappLinkCount,
    messengerLinkCount,
    telLinkCount,
    hreflangLanguages,
    ogTags,
    bookingButtonHref,
    bookingButtonExternalDomain,
    contactPageDetected,
    scriptSrcs,
    iframeSrcs,
    anchorHrefs,
  };
}

function collectSchemaTypes(node: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (typeof v === "object") {
      const obj = v as Record<string, unknown>;
      const t = obj["@type"];
      if (typeof t === "string") out.push(t);
      if (Array.isArray(t)) for (const x of t) if (typeof x === "string") out.push(x);
      for (const child of Object.values(obj)) walk(child);
    }
  };
  walk(node);
  return out;
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}
