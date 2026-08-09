export type RecommendationInput = {
  employeeName: string;
  occasion: string;
  budgetCents: number;
  workMode: "office" | "remote" | "hybrid";
  preferredDelivery: "workplace" | "home" | "digital_only";
  favoriteCake?: string;
  favoriteStore?: string;
  favoriteDrink?: string;
  preferredRewardTypes?: string[];
  interests?: string[];
  marketActive: boolean;
  previousGiftTitles?: string[];
  surpriseMe?: boolean;
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

    if (input.surpriseMe && canDeliverLocal && !previous.has(cakeTitle.toLowerCase())) {
      return {
        rewardType: "local", title: cakeTitle, amountCents: Math.min(input.budgetCents, 4900), score: input.favoriteCake ? 98 : 88,
        reason: input.favoriteCake ? `A local ${input.favoriteCake.toLowerCase()} cake matches ${input.employeeName}'s private Celebration Profile.` : `A locally delivered surprise fits ${input.employeeName}'s location, budget, and delivery preference.`,
        somethingDifferent: previous.size > 0, requiresApproval: true,
      };
    }

    if (input.surpriseMe && input.preferredRewardTypes?.includes("Experiences") && input.budgetCents >= 7500) {
      return {
        rewardType: "experience", title: "Local experience for two", amountCents: Math.min(input.budgetCents, 10000), score: 90,
        reason: `${input.employeeName} prefers experiences${input.interests?.length ? ` and enjoys ${input.interests[0].toLowerCase()}` : ""}. Employer approval is required before booking.`,
        somethingDifferent: previous.size > 0, requiresApproval: true,
      };
    }

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

    const firstChoice = input.favoriteStore || (input.favoriteDrink ? "Starbucks" : "Employee Choice");
    const store = previous.has(`${firstChoice} digital reward`.toLowerCase()) ? (firstChoice === "Target" ? "Employee Choice" : "Target") : firstChoice;
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
