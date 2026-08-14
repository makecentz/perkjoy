const DEFAULT_GOODY_BASE_URL = "https://api.ongoody.com";

export type GoodyImage = {
  url: string;
  width?: number;
  height?: number;
};

export type GoodyProduct = {
  id: string;
  name: string;
  brand: {
    id: string;
    name: string;
    shipping_price?: number | null;
  };
  subtitle?: string | null;
  subtitle_short?: string | null;
  recipient_description?: string | null;
  images?: Array<{ image_large?: GoodyImage | null; image_small?: GoodyImage | null }>;
  price: number;
  price_is_variable?: boolean;
  price_min?: number | null;
  price_max?: number | null;
  restricted_states?: string[];
  status?: string;
};

export type GoodyCatalogProduct = {
  id: string;
  name: string;
  brandName: string;
  description: string;
  imageUrl: string | null;
  priceCents: number;
  shippingCents: number;
  variablePrice: boolean;
  restrictedStates: string[];
};

export type GoodyOrder = {
  id: string;
  status: string;
  individual_gift_link: string;
  amounts?: {
    amount_product?: number | null;
    amount_shipping?: number | null;
    amount_processing_fee?: number | null;
    amount_pre_tax_total?: number | null;
    amount_total?: number | null;
  };
};

export type GoodyOrderBatch = {
  id: string;
  send_status: "pending" | "complete" | "failed" | "canceled";
  orders_count: number;
  orders_preview: GoodyOrder[];
  customer_reference_id?: string | null;
};

function configuration() {
  const apiKey = process.env.GOODY_API_KEY;
  if (!apiKey) throw new Error("Goody is not configured for this deployment.");
  return {
    apiKey,
    baseUrl: (process.env.GOODY_API_BASE_URL || DEFAULT_GOODY_BASE_URL).replace(/\/$/, ""),
  };
}

async function goodyRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey, baseUrl } = configuration();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(error?.message || error?.error || `Goody API request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function normalizeGoodyProduct(product: GoodyProduct): GoodyCatalogProduct {
  const image = product.images?.find((item) => item.image_large?.url || item.image_small?.url);
  return {
    id: product.id,
    name: product.name,
    brandName: product.brand.name,
    description: product.subtitle_short || product.subtitle || product.recipient_description || "A thoughtful gift delivered through Goody.",
    imageUrl: image?.image_large?.url || image?.image_small?.url || null,
    priceCents: product.price_min ?? product.price,
    shippingCents: product.brand.shipping_price ?? 0,
    variablePrice: Boolean(product.price_is_variable),
    restrictedStates: product.restricted_states ?? [],
  };
}

export async function listGoodyProducts(page = 1, perPage = 24) {
  const params = new URLSearchParams({ page: String(page), per_page: String(Math.min(100, Math.max(1, perPage))), country_code: "US" });
  const result = await goodyRequest<{ data: GoodyProduct[]; list_meta: { total_count: number } }>(`/v1/products?${params}`);
  return { products: result.data.map(normalizeGoodyProduct), totalCount: result.list_meta.total_count };
}

export async function retrieveGoodyProduct(productId: string) {
  return goodyRequest<GoodyProduct>(`/v1/products/${encodeURIComponent(productId)}`);
}

async function defaultCardId() {
  if (process.env.GOODY_CARD_ID) return process.env.GOODY_CARD_ID;
  const cards = await goodyRequest<{ data: Array<{ id: string }> }>("/v1/cards?per_page=1");
  const cardId = cards.data[0]?.id;
  if (!cardId) throw new Error("No active Goody greeting card is available.");
  return cardId;
}

export async function createGoodyGift(input: {
  requestId: string;
  fromName: string;
  message: string;
  recipient: { firstName: string; lastName: string; email: string };
  productId: string;
}) {
  const cardId = await defaultCardId();
  return goodyRequest<GoodyOrderBatch>("/v1/order_batches", {
    method: "POST",
    body: JSON.stringify({
      from_name: input.fromName,
      send_method: "email_and_link",
      recipients: [{ first_name: input.recipient.firstName, last_name: input.recipient.lastName, email: input.recipient.email }],
      cart: { items: [{ product_id: input.productId, quantity: 1 }] },
      card_id: cardId,
      message: input.message,
      customer_reference_id: input.requestId,
    }),
  });
}
