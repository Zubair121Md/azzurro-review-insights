export type TopicId =
  | "cleanliness"
  | "check-in"
  | "staff"
  | "noise"
  | "facilities"
  | "food"
  | "location"
  | "room"
  | "value";

export interface Topic {
  id: TopicId;
  label: string;
  description: string;
  /** English keywords, matched case-insensitively against whole words / phrases. */
  patterns: string[];
  /**
   * French, Spanish, German and Italian keywords. Together with English these
   * cover ~88% of the reviews. Only used for reviews Booking marks as written in
   * another language, so words like "personal" or "cara" can't misfire on English text.
   */
  translations: string[];
}

const L = "\\p{L}*"; // any trailing letters, accents included

export const TOPICS: Topic[] = [
  {
    id: "cleanliness",
    label: "Cleanliness",
    description: "Dirt, smells, stains, pests, hygiene and housekeeping",
    patterns: [
      "clean\\w*", "unclean", "dirt\\w*", "filth\\w*", "dust\\w*", "stain\\w*", "mou?ld\\w*",
      "smell\\w*", "stink\\w*", "stank", "odou?rs?", "hairs?", "bed ?bugs?", "cockroach\\w*", "roach\\w*",
      "insects?", "bugs?", "ants", "mice", "mouse", "rats?", "pests?", "hygien\\w*", "unhygienic",
      "grim(e|y)", "sticky", "rubbish", "trash", "housekeeping", "vomit", "blood", "musty", "damp", "gross",
    ],
    translations: [
      // fr
      "sales?", "saleté", "propre(té)?", "cafards?", "punaises?", "souris", "poils", "cheveux", "odeurs?", `moisi${L}`, "poussière", "insalubre", "hygiène",
      // es
      `suci${L}`, `limpi${L}`, "cucarachas?", "chinches?", `olor${L}`, "ol[ií]a", `rat[oó]n${L}`, "polvo", "moho", "higiene",
      // de
      `schmutzig${L}`, `dreck${L}`, `sauber${L}`, "unsauber", "kakerlaken?", "bettwanzen", "maus", "mäuse", "geruch", "gestank", "stinkt", `schimmel${L}`, `staub${L}`, "hygiene",
      // it
      `sporc${L}`, `pulit${L}`, "pulizia", "scarafaggi", "cimici", "topi", "odore", "puzza", "muffa", "igiene",
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
      "early check", "late check", "reservation", "booking was", "zoom", "video call", "kiosk",
    ],
    translations: [
      "arrivée", "enregistrement", "clés?", "clefs?", "valises?", "bagages?", // fr
      "llegada", "llaves?", "registro", "maletas?", "equipaje", // es
      "anreise", "ankunft", `schlüssel${L}`, "einchecken", `zugang${L}`, "gepäck", // de
      "arrivo", "chiavi?", "ingresso", "accesso", `bagagl${L}`, "valigi[ae]", // it
    ],
  },
  {
    id: "staff",
    label: "Staff & reception",
    description: "Reception, front desk, service attitude and helpfulness",
    patterns: [
      "staff", "receptions?", "receptionists?", "front desk", "reception desk", "managers?", "management",
      "employees?", "rude\\w*", "unhelpful", "helpful", "friendly", "unfriendly", "polite", "impolite",
      "customer service", "service", "host", "team", "attitude", "welcom\\w*", "communication",
      "no one (was )?(there|available)", "nobody",
    ],
    translations: [
      "personnel", "accueil", `réception${L}`, `employé${L}`, "aimable", `impoli${L}`, // fr
      "personal", `recepci[oó]n${L}`, "recepcionista", "amable", `maleducad${L}`, // es
      `mitarbeiter${L}`, "rezeption", `unfreundlich${L}`, `freundlich${L}`, // de
      "personale", "accoglienza", `scortes${L}`, `gentil${L}`, // it
    ],
  },
  {
    id: "noise",
    label: "Noise",
    description: "Noise from rooms, corridors, street, plumbing or other guests",
    patterns: [
      "nois\\w*", "loud\\w*", "sounds?", "hear(d|ing)?", "thin walls?", "snor\\w*", "part(y|ies)",
      "music", "traffic", "construction", "quiet\\w*", "ear ?plugs?", "banging", "slamm\\w*", "shouting",
      "yelling", "soundproof\\w*", "woke", "woken", "squeak\\w*",
    ],
    translations: [
      `bruit${L}`, `bruyant${L}`, // fr
      `ruid${L}`, // es
      `lärm${L}`, "laut", "hellhörig", // de
      `rumor${L}`, // it
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
      "parking", "common (area|room)s?", "lounge", "towels?", "toiletries", "amenities",
      "facilit\\w*", "power (points?|outlets?|sockets?)", "sockets?", "usb", "hair ?dryer", "drains?",
    ],
    translations: [
      "douches?", "toilettes?", "salles? de bains?", "cuisine", "ascenseur", "climatisation", "clim", "chauffage", "eau chaude", "casiers?", "escaliers?", // fr
      "duchas?", "baños?", "aseos?", "cocina", "ascensor", "aire acondicionado", `calefacci[oó]n`, "agua caliente", "taquillas?", "escaleras?", // es
      `dusche${L}`, `toilette${L}`, "badezimmer", "küche", "aufzug", "klimaanlage", "heizung", "warmwasser", `schließf[aä]ch${L}`, `treppe${L}`, // de
      `docci${L}`, `bagn${L}`, "cucina", "ascensore", "aria condizionata", "riscaldamento", "acqua calda", `armadiett${L}`, "scale", // it
    ],
  },
  {
    id: "food",
    label: "Food & breakfast",
    description: "Breakfast, included dinners, coffee and dietary options",
    patterns: [
      "breakfast", "dinners?", "lunch", "meals?", "food", "buffet", "coffee", "tea", "toast", "cereal",
      "menu", "vegetarian", "vegan", "gluten", "milk", "bread",
    ],
    translations: [
      "petit[- ]déjeuner", "dîner", "repas", "nourriture", // fr
      "desayuno", "cena", "comida", // es
      "frühstück", "abendessen", "essen", // de
      "colazione", "cibo", "pasti?", // it
    ],
  },
  {
    id: "location",
    label: "Location",
    description: "Neighbourhood, transport links, safety and convenience of the area",
    patterns: [
      "location", "located", "area", "neighbou?rhood", "walk(ing)? distance", "short walk", "walkable",
      "walk(ing)? to", "stations?", "trains?", "bus(es)?", "transport", "close to", "nearby", "near",
      "central", "cbd", "city", "kings cross", "darling harbou?r", "surry hills", "oxford st\\w*",
      "convenien\\w*", "unsafe", "safe", "dodgy", "sketchy", "restaurants?", "shops?", "beach",
    ],
    translations: [
      "emplacement", "quartier", "situ[ée]e?", "gare", "métro", "proche", // fr
      `ubicaci[oó]n`, "barrio", "zona", `estaci[oó]n`, `c[eé]ntric${L}`, // es
      "lage", "gegend", "viertel", "bahnhof", `zentral${L}`, // de
      "posizione", "quartiere", "stazione", "centrale", // it
    ],
  },
  {
    id: "room",
    label: "Room condition",
    description: "Room size, beds, linen, maintenance and general state of the room or pod",
    patterns: [
      "beds?", "mattress\\w*", "pillows?", "sheets?", "linen", "blankets?", "duvet", "doona",
      "pods?", "bunks?", "bunkbeds?", "tiny", "small", "cramped", "windows?", "windowless", "old", "worn",
      "tired", "dated", "run[ -]down", "broken", "damaged", "maintenance", "repairs?", "peeling",
      "curtains?", "blinds", "furniture", "mirrors?", "space", "uncomfortable", "comfortable", "comfy",
      "renovat\\w*", "carpet", "shel(f|ves)", "storage",
    ],
    translations: [
      "lits?", "matelas", "oreillers?", "draps", "petite?s?", "vieu[xs]?", `vieill${L}`, `cass[ée]${L}`, "rideaux?", "fenêtres?", // fr
      "camas?", `colch[oó]n${L}`, "almohadas?", "sábanas?", `pequeñ${L}`, `viej${L}`, "rot[oa]s?", "cortinas?", "ventanas?", // es
      `bett${L}`, `matratze${L}`, "kissen", `klein${L}`, "alte[mnrs]?", `kaputt${L}`, "vorhang", "fenster", // de
      "letti?", `materass${L}`, `cuscin${L}`, `lenzuol${L}`, `piccol${L}`, `vecchi${L}`, `rott${L}`, "tende", `finestr${L}`, // it
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
    translations: [
      "prix", "cher", "chère", "frais", `rembours${L}`, "caution", // fr
      "precio", "car[oa]", "dinero", `reembols${L}`, "fianza", `dep[oó]sito`, // es
      `preis${L}`, `teuer${L}`, "geld", `gebühr${L}`, "kaution", // de
      "prezzo", `costos[oa]`, "soldi", `rimbors${L}`, "cauzione", // it
    ],
  },
];

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<TopicId, Topic>;

/** Booking language codes treated as English ("xu" is how Booking tags many English reviews). */
const ENGLISH = new Set(["en", "en-gb", "en-us", "xu"]);

export function isEnglish(language: string | null | undefined): boolean {
  return !language || ENGLISH.has(language.toLowerCase());
}

const boundary = (alternation: string) => `(?<![\\p{L}\\p{N}_-])(?:${alternation})(?![\\p{L}\\p{N}_-])`;

const compiled = TOPICS.map((t) => ({
  id: t.id,
  english: new RegExp(boundary(t.patterns.join("|")), "iu"),
  any: new RegExp(boundary([...t.patterns, ...t.translations].join("|")), "iu"),
}));

/** "Nothing", "n/a", "all good" etc. — guests often fill the disliked box with these. */
const TRIVIAL =
  /^\s*(nothing|none|nil|na|n\/a|no|nope|-+|\.+|all good|nothing really|nothing at all|nothing to dislike|no complaints?|everything was (good|great|fine|perfect)|rien|nada|nichts|niente)\W*\s*$/iu;

/** "None, everything was clean" — a positive remark written in the dislikes box. */
const NOTHING_BUT_PRAISE =
  /^\s*(nothing|none|no complaints?)\b[\s,.!-]*(really|at all|everything|all|it was|was|i liked|loved|great|perfect)\b/i;

export function isTrivial(text: string | null | undefined): boolean {
  if (!text) return true;
  return TRIVIAL.test(text) || (text.length < 80 && NOTHING_BUT_PRAISE.test(text));
}

/** Returns the topics whose keywords appear in `text`, in taxonomy order. */
export function detectTopics(text: string | null | undefined, language?: string | null): TopicId[] {
  if (isTrivial(text)) return [];
  const useAll = !isEnglish(language);
  return compiled.filter((c) => (useAll ? c.any : c.english).test(text!)).map((c) => c.id);
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
  language?: string | null;
}): { issues: TopicId[]; praise: TopicId[] } {
  const issueText = isTrivial(r.disliked) && r.score < 6 ? r.title : r.disliked;
  return {
    issues: detectTopics(issueText, r.language),
    praise: detectTopics(r.liked, r.language),
  };
}

/** Splits text into chunks flagged when they match a topic keyword, for highlighting in the UI. */
export function highlightTopics(
  text: string,
  topics: TopicId[],
  language?: string | null,
): { text: string; topic?: TopicId }[] {
  if (!topics.length) return [{ text }];
  const useAll = !isEnglish(language);
  const parts = compiled
    .filter((c) => topics.includes(c.id))
    .map((c) => `(?<${c.id.replace("-", "_")}>${(useAll ? c.any : c.english).source})`);
  const re = new RegExp(parts.join("|"), "giu");
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
