export const PROFILE_REWARD_TYPES = ["Gift Cards", "Food", "Experiences", "Physical Gifts", "Charitable Donation", "Surprise Me"] as const;
export const PROFILE_INTERESTS = ["Sports", "Gaming", "Music", "Movies", "Fitness", "Fashion", "Technology", "Food", "Travel", "Books", "Outdoors", "Other"] as const;
export const PROFILE_DIETARY = ["Vegetarian", "Vegan", "Gluten-Free", "Nut Allergy", "Other", "Prefer Not to Say"] as const;
export const PROFILE_SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;

export function profileToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function hashProfileToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function allowedStrings(value: unknown, allowed: readonly string[], limit: number) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter((item) => allowed.includes(item)))].slice(0, limit);
}

export function profileCompleteness(input: {
  food: Record<string, string>;
  stores: string[];
  rewardTypes: string[];
  interests: string[];
  dietary: string[];
  shirtSize: string;
  preferredDelivery: string;
}) {
  const sections = [
    Object.values(input.food).some(Boolean),
    input.stores.length > 0 || input.rewardTypes.length > 0,
    input.interests.length > 0,
    input.dietary.length > 0,
    Boolean(input.shirtSize),
    Boolean(input.preferredDelivery),
  ];
  return Math.round(sections.filter(Boolean).length / sections.length * 100);
}
