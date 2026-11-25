export type TopicId =
  | "cleanliness"
  | "check-in"
  | "staff"
  | "noise"
  | "facilities"
  | "location"
  | "room"
  | "value";

export interface Topic {
  id: TopicId;
  label: string;
  description: string;
  /** Patterns are matched case-insensitively against whole words / phrases. */
  patterns: string[];
}

export const TOPICS: Topic[] = [
  {
    id: "cleanliness",
    label: "Cleanliness",
    description: "Dirt, smells, stains, pests, hygiene and housekeeping",
    patterns: [
      "clean\\w*", "unclean", "dirt\\w*", "filth\\w*", "dust\\w*", "stain\\w*", "mou?ld\\w*",
      "smell\\w*", "stink\\w*", "stank", "odou?rs?", "hairs?", "bed ?bugs?", "cockroach\\w*", "roach\\w*",
      "insects?", "bugs?", "ants", "mice", "mouse", "rats?", "pests?", "hygien\\w*", "unhygienic",
      "grim(e|y)", "sticky", "rubbish", "trash", "housekeeping", "vomit", "blood", "musty", "damp",
    ],
  },
  {
    id: "check-in",
    label: "Check-in & access",
    description: "Arrival, check-in/out process, keys, door codes and instructions",
    patterns: [
      "check[ -]?ins?", "checking in", "checked in", "check[ -]?outs?", "checking out", "checked out",
      "arriv(al|e|ed|ing)", "key ?cards?", "keys?", "(door|access|entry|pin) ?codes?", "codes?",
      "self[ -]check\\w*", "instructions?", "locked out", "get in", "access(ing)?", "luggage", "bags? storage",
      "early check", "late check", "reservation", "booking was", "waited", "waiting", "queue",
    ],
  },
  {
    id: "staff",
    label: "Staff & reception",
    description: "Reception, front desk, service attitude and helpfulness",
    patterns: [
      "staff", "receptions?", "receptionists?", "front desk", "desk", "managers?", "management",
      "employees?", "rude\\w*", "unhelpful", "helpful", "friendly", "unfriendly", "polite", "impolite",
      "customer service", "service", "host", "team", "attitude", "welcom\\w*", "communication",
      "no one (was )?(there|available)", "nobody",
    ],
  },
  {
    id: "noise",
    label: "Noise",
    description: "Noise from rooms, corridors, street, plumbing or other guests",
    patterns: [
      "nois\\w*", "loud\\w*", "sounds?", "hear(d|ing)?", "thin walls?", "snor\\w*", "part(y|ies)",
      "music", "traffic", "construction", "quiet\\w*", "ear ?plugs?", "banging", "slamm\\w*", "shouting",
      "yelling", "soundproof\\w*",
    ],
  },
  {
    id: "facilities",
    label: "Facilities",
    description: "Bathrooms, showers, kitchen, lift, Wi-Fi, air-con and shared amenities",
    patterns: [
      "bathrooms?", "showers?", "toilets?", "wc", "hot water", "water pressure", "kitchen\\w*", "lifts?",
      "elevators?", "stairs", "wi-?fi", "internet", "air ?con\\w*", "a/?c", "aircon", "heat(er|ing)",
      "fans?", "laundry", "washing machine", "lockers?", "tv", "fridge", "kettle", "microwave",
      "parking", "breakfast", "common (area|room)s?", "lounge", "towels?", "toiletries", "amenities",
      "facilit\\w*", "power (points?|outlets?|sockets?)", "sockets?", "usb", "hair ?dryer",
    ],
  },
  {
    id: "location",
    label: "Location",
    description: "Neighbourhood, transport links, safety and convenience of the area",
    patterns: [
      "location", "located", "area", "neighbou?rhood", "walk\\w*", "stations?", "trains?", "bus(es)?",
      "transport", "close to", "nearby", "near", "central", "cbd", "city", "kings cross", "darling harbou?r",
      "surry hills", "oxford st\\w*", "convenien\\w*", "street", "unsafe", "safe", "dodgy", "sketchy",
      "restaurants?", "shops?", "beach",
    ],
  },
  {
    id: "room",
    label: "Room condition",
    description: "Room size, beds, linen, maintenance and general state of the room or pod",
    patterns: [
      "rooms?", "beds?", "mattress\\w*", "pillows?", "sheets?", "linen", "blankets?", "duvet", "doona",
      "pods?", "bunks?", "tiny", "small", "cramped", "windows?", "windowless", "old", "worn", "tired",
      "dated", "run[ -]down", "broken", "damaged", "maintenance", "repairs?", "peeling", "curtains?",
      "blinds", "furniture", "mirror", "space", "uncomfortable", "comfortable", "comfy",
      "renovat\\w*", "carpet",
    ],
  },
  {
    id: "value",
    label: "Value for money",
    description: "Price, fees, deposits, refunds and whether the stay was worth it",
    patterns: [
      "pric(e|es|ed|ing|ey|y)", "expensive", "overpriced", "cheap\\w*", "value", "money", "worth\\w*",
      "cost\\w*", "fees?", "charg\\w*", "deposit", "refund\\w*", "paid", "pay\\w*", "budget", "afford\\w*",
      "rip[ -]?off", "\\$\\d+",
    ],
  },
];

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<TopicId, Topic>;

const compiled = TOPICS.map((t) => ({
  id: t.id,
  re: new RegExp(`(?<![\\w-])(?:${t.patterns.join("|")})(?![\\w-])`, "i"),
}));

/** "Nothing", "n/a", "all good" etc. — guests often fill the disliked box with these. */
const TRIVIAL = /^\s*(nothing|none|nil|na|n\/a|no|nope|-+|\.+|all good|nothing really|nothing at all|nothing to dislike|no complaints?|everything was (good|great|fine|perfect))\W*\s*$/i;

export function isTrivial(text: string | null | undefined): boolean {
  return !text || TRIVIAL.test(text);
}

/** Returns the topics whose keywords appear in `text`, in taxonomy order. */
export function detectTopics(text: string | null | undefined): TopicId[] {
  if (isTrivial(text)) return [];
  return compiled.filter((c) => c.re.test(text!)).map((c) => c.id);
}

/**
 * Booking.com asks guests what they liked and what they didn't like in two
 * separate boxes, so the polarity comes from *which box* the words are in.
 * Issues = topics in the "disliked" box. Praise = topics in the "liked" box.
 * Headlines mix both ("Good location, dirty room"), so a negative review's
 * headline is only used when the guest left the disliked box empty.
 */
export function classifyReview(r: {
  title: string | null;
  liked: string | null;
  disliked: string | null;
  score: number;
}): { issues: TopicId[]; praise: TopicId[] } {
  const issueText = isTrivial(r.disliked) && r.score < 6 ? r.title : r.disliked;
  return {
    issues: detectTopics(issueText),
    praise: detectTopics(r.liked),
  };
}

/** Splits text into chunks flagged when they match a topic keyword, for highlighting in the UI. */
export function highlightTopics(text: string, topics: TopicId[]): { text: string; topic?: TopicId }[] {
  if (!topics.length) return [{ text }];
  const parts = compiled
    .filter((c) => topics.includes(c.id))
    .map((c) => `(?<${c.id.replace("-", "_")}>${c.re.source})`);
  const re = new RegExp(parts.join("|"), "gi");
  const out: { text: string; topic?: TopicId }[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: text.slice(last, idx) });
    const group = Object.entries(m.groups ?? {}).find(([, v]) => v !== undefined)?.[0];
    out.push({ text: m[0], topic: group?.replace("_", "-") as TopicId });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
