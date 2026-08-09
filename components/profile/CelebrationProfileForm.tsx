"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Gift, Heart, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const rewardTypes = ["Gift Cards", "Food", "Experiences", "Physical Gifts", "Charitable Donation", "Surprise Me"];
const interests = ["Sports", "Gaming", "Music", "Movies", "Fitness", "Fashion", "Technology", "Food", "Travel", "Books", "Outdoors", "Other"];
const dietary = ["Vegetarian", "Vegan", "Gluten-Free", "Nut Allergy", "Other", "Prefer Not to Say"];

export function CelebrationProfileForm({ token }: { token: string }) {
  const [invite, setInvite] = useState<{ firstName: string; organizationName: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/celebration-profile/${encodeURIComponent(token)}`)
      .then(async (response) => { const json = await response.json(); if (!response.ok) throw new Error(json.error); setInvite(json); })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "We couldn't open this invitation."));
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, unknown>;
    payload.favoriteStores = String(form.get("favoriteStores") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    payload.rewardTypes = form.getAll("rewardTypes"); payload.interests = form.getAll("interests"); payload.dietary = form.getAll("dietary");
    try {
      const response = await fetch(`/api/celebration-profile/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error); setSaved(json.completeness);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't save your profile."); }
    finally { setBusy(false); }
  }

  if (error && !invite) return <main className="profile-invite-page"><section className="profile-invite-error"><LockKeyhole /><h1>This link needs a refresh.</h1><p>{error}</p><Link href="/">Back to PerkJoy</Link></section></main>;
  if (!invite) return <main className="profile-invite-page"><LoaderCircle className="profile-spinner" /></main>;
  if (saved !== null) return <main className="profile-invite-page"><section className="profile-invite-success"><span><Check /></span><small>PROFILE SAVED · {saved}% COMPLETE</small><h1>Thank you, {invite.firstName}! 🎉</h1><p>PerkJoy can now recommend celebrations that feel more like you. You can always ask {invite.organizationName} for a fresh link to update your choices.</p><div><LockKeyhole /> Private preferences stay private unless you chose to share them.</div></section></main>;

  return <main className="profile-invite-page"><nav><Logo /><span><LockKeyhole /> Secure private link</span></nav><header><div className="eyebrow"><Sparkles /> A two-minute profile</div><h1>Help us celebrate you better 🎉</h1><p>{invite.organizationName} uses PerkJoy to make employee celebrations more personal. Tell us what you actually like. Skip anything you&apos;d rather not answer.</p></header><form onSubmit={submit} className="profile-form-card">
    <section><div><span><Heart /></span><h2>Your favorites</h2><p>A few clues help us choose something you&apos;ll genuinely enjoy.</p></div><div className="profile-form-grid"><label>Favorite cake flavor<input name="favoriteCake" placeholder="Chocolate, vanilla, red velvet…" /></label><label>Favorite dessert<input name="favoriteDessert" /></label><label>Favorite restaurant<input name="favoriteRestaurant" /></label><label>Favorite lunch<input name="favoriteLunch" /></label><label>Favorite snack<input name="favoriteSnack" /></label><label>Favorite coffee or drink<input name="favoriteDrink" /></label></div></section>
    <section><div><span><Gift /></span><h2>Rewards you&apos;d enjoy</h2><p>Choose as many as you like.</p></div><label>Favorite stores<input name="favoriteStores" placeholder="Target, Starbucks, REI" /></label><fieldset><legend>Preferred reward types</legend><div className="profile-choice-grid">{rewardTypes.map((item) => <label key={item}><input type="checkbox" name="rewardTypes" value={item} /><span>{item}</span></label>)}</div></fieldset></section>
    <section><div><span><Sparkles /></span><h2>Interests</h2><p>Optional, useful for experiences and physical gifts.</p></div><div className="profile-choice-grid">{interests.map((item) => <label key={item}><input type="checkbox" name="interests" value={item} /><span>{item}</span></label>)}</div><div className="profile-form-grid"><label>Optional shirt size<select name="shirtSize"><option value="">Skip</option><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>2XL</option><option>3XL</option></select></label><label>Preferred celebration delivery<select name="preferredDelivery"><option value="workplace">Workplace</option><option value="home">Home</option><option value="digital_only">Digital only</option></select></label></div></section>
    <section><div><span><Heart /></span><h2>Dietary preferences</h2><p>Used only to avoid poor food recommendations—not as medical information.</p></div><div className="profile-choice-grid">{dietary.map((item) => <label key={item}><input type="checkbox" name="dietary" value={item} /><span>{item}</span></label>)}</div></section>
    <section className="profile-privacy"><LockKeyhole /><div><h2>Your privacy choice</h2><label aria-label="Keep my preferences private"><input type="radio" name="privacyMode" value="recommendations_only" defaultChecked /><span><b>Keep my preferences private</b><small>Only use them to recommend gifts.</small></span></label><label aria-label="Share preferences with HR"><input type="radio" name="privacyMode" value="share_with_hr" /><span><b>Share with HR</b><small>Allow authorized company admins to view my answers.</small></span></label></div></section>
    {error && <p className="profile-form-error">{error}</p>}<button className="button button-primary button-large" disabled={busy}>{busy ? "Saving…" : "Save My Celebration Profile"}<ArrowRight /></button><small className="profile-form-note">Every question is optional. Your delivery address is never shown here.</small>
  </form></main>;
}
