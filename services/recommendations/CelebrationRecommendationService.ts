export type RecommendationInput = {
  employeeName: string;
  occasion: string;
  budgetCents: number;
  workMode: "office" | "remote" | "hybrid";
  preferredDelivery: "workplace" | "home" | "digital_only";
  favoriteCake?: string;
  favoriteStore?: string;
  favoriteDrink?: string;
  marketActive: boolean;
  previousGiftTitles?: string[];
};

export type CelebrationRecommendation = {
  rewardType: "local" | "digital" | "experience";
  title: string;
  amountCents: number;
  score: number;
  reason: string;
  somethingDifferent: boolean;
  requiresApproval: boolean;
};

export interface RecommendationProvider {
  recommend(input: RecommendationInput): CelebrationRecommendation;
}

export class RuleBasedRecommendationProvider implements RecommendationProvider {
  recommend(input: RecommendationInput): CelebrationRecommendation {
    const previous = new Set((input.previousGiftTitles ?? []).map((gift) => gift.toLowerCase()));
    const canDeliverLocal = input.marketActive && input.preferredDelivery !== "digital_only" && input.budgetCents >= 4900;
    const cakeTitle = `${input.favoriteCake || "Celebration"} Birthday Cake`;

    if (canDeliverLocal && !previous.has(cakeTitle.toLowerCase())) {
      return {
        rewardType: "local",
        title: cakeTitle,
        amountCents: Math.min(input.budgetCents, 4900),
        score: input.favoriteCake ? 96 : 84,
        reason: input.favoriteCake
          ? `${input.employeeName} selected ${input.favoriteCake.toLowerCase()} as a favorite cake flavor.`
          : `A locally delivered celebration matches ${input.employeeName}'s delivery preference.`,
        somethingDifferent: previous.size > 0,
        requiresApproval: true,
      };
    }

    const store = input.favoriteStore || (input.favoriteDrink ? "Starbucks" : "Employee Choice");
    const amountCents = Math.max(0, Math.min(input.budgetCents, 5000));
    return {
      rewardType: "digital",
      title: `${store} digital reward`,
      amountCents,
      score: input.favoriteStore || input.favoriteDrink ? 91 : 76,
      reason: input.favoriteDrink
        ? `${input.employeeName} selected coffee as a favorite, and digital delivery works anywhere.`
        : `${store} fits the celebration budget and ${input.workMode} work mode.`,
      somethingDifferent: previous.size > 0 && !previous.has(`${store} digital reward`.toLowerCase()),
      requiresApproval: amountCents > 5000,
    };
  }
}
