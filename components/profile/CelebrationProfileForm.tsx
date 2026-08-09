"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Gift,
  Heart,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import {
  PROFILE_DIETARY,
  PROFILE_INTERESTS,
  PROFILE_REWARD_TYPES,
  PROFILE_SHIRT_SIZES,
  profileCompleteness,
} from "@/lib/celebration-profile";

type Invite = {
  firstName: string;
  organizationName: string;
  completeness: number;
  privacyMode: "share_with_hr" | "recommendations_only";
  preferredDelivery: "workplace" | "home" | "digital_only";
  preferences: null | {
    food: Record<string, string>;
    rewards: { stores?: string[]; types?: string[] };
    interests: string[];
    shirtSize: string;
    dietary: string[];
  };
};

export function CelebrationProfileForm({ token }: { token: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [draftCompleteness, setDraftCompleteness] = useState(0);

  useEffect(() => {
    fetch(`/api/celebration-profile/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const json = (await response.json()) as Invite & { error?: string };
        if (!response.ok) throw new Error(json.error ?? "We couldn't open this invitation.");
        setInvite(json);
        setDraftCompleteness(json.completeness);
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "We couldn't open this invitation.",
        ),
      );
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<
      string,
      unknown
    >;
    payload.favoriteStores = String(form.get("favoriteStores") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    payload.rewardTypes = form.getAll("rewardTypes");
    payload.interests = form.getAll("interests");
    payload.dietary = form.getAll("dietary");
    try {
      const response = await fetch(
        `/api/celebration-profile/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await response.json()) as {
        completeness?: number;
        error?: string;
      };
      if (!response.ok || json.completeness === undefined)
        throw new Error(json.error ?? "We couldn't save your profile.");
      setSaved(json.completeness);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We couldn't save your profile.",
      );
    } finally {
      setBusy(false);
    }
  }

  function updateCompleteness(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    setDraftCompleteness(
      profileCompleteness({
        food: {
          cake: String(form.get("favoriteCake") ?? ""),
          dessert: String(form.get("favoriteDessert") ?? ""),
          restaurant: String(form.get("favoriteRestaurant") ?? ""),
          lunch: String(form.get("favoriteLunch") ?? ""),
          snack: String(form.get("favoriteSnack") ?? ""),
          drink: String(form.get("favoriteDrink") ?? ""),
        },
        stores: String(form.get("favoriteStores") ?? "")
          .split(",")
          .filter(Boolean),
        rewardTypes: form.getAll("rewardTypes").map(String),
        interests: form.getAll("interests").map(String),
        dietary: form.getAll("dietary").map(String),
        shirtSize: String(form.get("shirtSize") ?? ""),
        preferredDelivery: String(form.get("preferredDelivery") ?? ""),
      }),
    );
  }

  if (error && !invite)
    return (
      <main className="profile-invite-page">
        <section className="profile-invite-error">
          <LockKeyhole />
          <h1>This link needs a refresh.</h1>
          <p>{error}</p>
          <Link href="/">Back to PerkJoy</Link>
        </section>
      </main>
    );
  if (!invite)
    return (
      <main className="profile-invite-page">
        <LoaderCircle className="profile-spinner" />
      </main>
    );
  if (saved !== null)
    return (
      <main className="profile-invite-page">
        <section className="profile-invite-success">
          <span>
            <Check />
          </span>
          <small>PROFILE SAVED · {saved}% COMPLETE</small>
          <h1>Thank you, {invite.firstName}! 🎉</h1>
          <p>
            PerkJoy can now recommend celebrations that feel more like you. You
            can always ask {invite.organizationName} for a fresh link to update
            your choices.
          </p>
          <div>
            <LockKeyhole /> Private preferences stay private unless you chose to
            share them.
          </div>
        </section>
      </main>
    );

  const food = invite.preferences?.food ?? {};
  const rewards = invite.preferences?.rewards ?? {};
  return (
    <main className="profile-invite-page">
      <nav>
        <Logo />
        <span>
          <LockKeyhole /> Secure private link
        </span>
      </nav>
      <header>
        <div className="eyebrow">
          <Sparkles /> A two-minute profile
        </div>
        <h1>Help us celebrate you better 🎉</h1>
        <p>
          {invite.organizationName} uses PerkJoy to make employee celebrations
          more personal. Tell us what you actually like. Skip anything
          you&apos;d rather not answer.
        </p>
      </header>
      <form
        onSubmit={submit}
        onChange={updateCompleteness}
        className="profile-form-card"
      >
        <div className="profile-live-progress">
          <span>
            <b>{draftCompleteness}% complete</b>
            <small>
              Your profile gets more useful with every section—but every answer
              is optional.
            </small>
          </span>
          <i>
            <b style={{ width: `${draftCompleteness}%` }} />
          </i>
        </div>
        <section>
          <div>
            <span>
              <Heart />
            </span>
            <h2>Your favorites</h2>
            <p>
              A few clues help us choose something you&apos;ll genuinely enjoy.
            </p>
          </div>
          <div className="profile-form-grid">
            <label>
              Favorite cake flavor
              <input
                name="favoriteCake"
                defaultValue={food.cake ?? ""}
                placeholder="Chocolate, vanilla, red velvet…"
              />
            </label>
            <label>
              Favorite dessert
              <input name="favoriteDessert" defaultValue={food.dessert ?? ""} />
            </label>
            <label>
              Favorite restaurant
              <input
                name="favoriteRestaurant"
                defaultValue={food.restaurant ?? ""}
              />
            </label>
            <label>
              Favorite lunch
              <input name="favoriteLunch" defaultValue={food.lunch ?? ""} />
            </label>
            <label>
              Favorite snack
              <input name="favoriteSnack" defaultValue={food.snack ?? ""} />
            </label>
            <label>
              Favorite coffee or drink
              <input name="favoriteDrink" defaultValue={food.drink ?? ""} />
            </label>
          </div>
        </section>
        <section>
          <div>
            <span>
              <Gift />
            </span>
            <h2>Rewards you&apos;d enjoy</h2>
            <p>Choose as many as you like.</p>
          </div>
          <label>
            Favorite stores
            <input
              name="favoriteStores"
              defaultValue={(rewards.stores ?? []).join(", ")}
              placeholder="Target, Starbucks, REI"
            />
          </label>
          <fieldset>
            <legend>Preferred reward types</legend>
            <div className="profile-choice-grid">
              {PROFILE_REWARD_TYPES.map((item) => (
                <label key={item}>
                  <input
                    type="checkbox"
                    name="rewardTypes"
                    value={item}
                    defaultChecked={rewards.types?.includes(item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
        <section>
          <div>
            <span>
              <Sparkles />
            </span>
            <h2>Interests</h2>
            <p>Optional, useful for experiences and physical gifts.</p>
          </div>
          <div className="profile-choice-grid">
            {PROFILE_INTERESTS.map((item) => (
              <label key={item}>
                <input
                  type="checkbox"
                  name="interests"
                  value={item}
                  defaultChecked={invite.preferences?.interests.includes(item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <div className="profile-form-grid">
            <label>
              Optional shirt size
              <select
                name="shirtSize"
                defaultValue={invite.preferences?.shirtSize ?? ""}
              >
                <option value="">Skip</option>
                {PROFILE_SHIRT_SIZES.map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
            <label>
              Preferred celebration delivery
              <select
                name="preferredDelivery"
                defaultValue={invite.preferredDelivery}
              >
                <option value="workplace">Workplace</option>
                <option value="home">Home</option>
                <option value="digital_only">Digital only</option>
              </select>
            </label>
          </div>
        </section>
        <section>
          <div>
            <span>
              <Heart />
            </span>
            <h2>Dietary preferences</h2>
            <p>
              Used only to avoid poor food recommendations—not as medical
              information.
            </p>
          </div>
          <div className="profile-choice-grid">
            {PROFILE_DIETARY.map((item) => (
              <label key={item}>
                <input
                  type="checkbox"
                  name="dietary"
                  value={item}
                  defaultChecked={invite.preferences?.dietary.includes(item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </section>
        <section className="profile-privacy">
          <LockKeyhole />
          <div>
            <h2>Your privacy choice</h2>
            <label aria-label="Keep my preferences private">
              <input
                type="radio"
                name="privacyMode"
                value="recommendations_only"
                defaultChecked={invite.privacyMode === "recommendations_only"}
              />
              <span>
                <b>Keep my preferences private</b>
                <small>Only use them to recommend gifts.</small>
              </span>
            </label>
            <label aria-label="Share preferences with HR">
              <input
                type="radio"
                name="privacyMode"
                value="share_with_hr"
                defaultChecked={invite.privacyMode === "share_with_hr"}
              />
              <span>
                <b>Share with HR</b>
                <small>
                  Allow authorized company admins to view my answers.
                </small>
              </span>
            </label>
          </div>
        </section>
        {error && <p className="profile-form-error">{error}</p>}
        <button className="button button-primary button-large" disabled={busy}>
          {busy ? "Saving…" : "Save My Celebration Profile"}
          <ArrowRight />
        </button>
        <small className="profile-form-note">
          Every question is optional. Your delivery address is never shown here.
        </small>
      </form>
    </main>
  );
}
