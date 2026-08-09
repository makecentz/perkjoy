export type CreateRewardInput = {
  idempotencyKey: string;
  amount: number;
  currency: "USD";
  recipient: { name: string; email: string };
  productId?: string;
};

export type ProviderReward = {
  orderId: string;
  rewardId: string;
  status: string;
  testMode: boolean;
};

export interface RewardProvider {
  createReward(input: CreateRewardInput): Promise<ProviderReward>;
  getReward(rewardId: string): Promise<ProviderReward>;
  getProducts(): Promise<Array<{ id: string; name: string }>>;
  cancelRewardIfSupported(rewardId: string): Promise<boolean>;
  handleWebhook(payload: unknown): Promise<{ eventId: string; rewardId?: string; status?: string }>;
}
