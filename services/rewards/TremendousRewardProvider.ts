import type { CreateRewardInput, ProviderReward, RewardProvider } from "./RewardProvider";

type TremendousResponse = { order?: { id: string; rewards?: Array<{ id: string; status: string }> }; reward?: { id: string; status: string }; products?: Array<{ id: string; name: string }> };

export class TremendousRewardProvider implements RewardProvider {
  private readonly apiKey: string;
  private readonly fundingSourceId: string;
  private readonly baseUrl: string;
  readonly testMode: boolean;

  constructor() {
    this.apiKey = process.env.TREMENDOUS_API_KEY ?? "";
    this.fundingSourceId = process.env.TREMENDOUS_FUNDING_SOURCE_ID ?? "";
    const environment = process.env.TREMENDOUS_ENVIRONMENT ?? "sandbox";
    const liveMode = process.env.REWARDS_LIVE_MODE === "true";
    if (liveMode && environment !== "production") throw new Error("Live rewards require the production Tremendous environment.");
    if (!liveMode && environment !== "sandbox") throw new Error("Production Tremendous endpoints are blocked while REWARDS_LIVE_MODE=false.");
    this.testMode = !liveMode;
    this.baseUrl = this.testMode ? "https://testflight.tremendous.com/api/v2" : "https://api.tremendous.com/api/v2";
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.apiKey) throw new Error("Tremendous is not configured.");
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    if (!response.ok) throw new Error(`Tremendous request failed (${response.status}).`);
    return response.json() as Promise<T>;
  }

  async createReward(input: CreateRewardInput): Promise<ProviderReward> {
    const data = await this.request<TremendousResponse>("/orders", { method: "POST", body: JSON.stringify({ external_id: input.idempotencyKey, payment: { funding_source_id: this.fundingSourceId }, reward: { value: { denomination: input.amount, currency_code: input.currency }, delivery: { method: "EMAIL" }, recipient: { name: input.recipient.name, email: input.recipient.email }, products: input.productId ? [input.productId] : ["OKMHM2X2OHYV"] } }) });
    const reward = data.order?.rewards?.[0];
    if (!data.order || !reward) throw new Error("Tremendous returned an incomplete reward response.");
    return { orderId: data.order.id, rewardId: reward.id, status: reward.status, testMode: this.testMode };
  }
  async getReward(rewardId: string) { const data = await this.request<TremendousResponse>(`/rewards/${encodeURIComponent(rewardId)}`); if (!data.reward) throw new Error("Reward not found."); return { orderId: "", rewardId: data.reward.id, status: data.reward.status, testMode: this.testMode }; }
  async getProducts() { const data = await this.request<TremendousResponse>("/products"); return data.products ?? []; }
  async cancelRewardIfSupported() { return false; }
  async handleWebhook(payload: unknown) { const event = payload as { id?: string; resource?: { id?: string }; type?: string }; if (!event.id) throw new Error("Webhook event is missing an id."); return { eventId: event.id, rewardId: event.resource?.id, status: event.type?.split(".").at(-1) }; }
}
