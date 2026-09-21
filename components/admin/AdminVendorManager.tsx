"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ImagePlus, LoaderCircle, MapPin, Plus, Power, Store, Upload, X } from "lucide-react";
import { authenticatedFetch } from "@/lib/supabase/fetch";

type Vendor = {
  id: string;
  businessName: string;
  email: string | null;
  location: string;
  logoUrl: string | null;
  active: boolean;
  featured: boolean;
  marketName: string;
  listingCount: number;
  activeListingCount: number;
};

type Market = { id: string; name: string; city: string; state: string; active: boolean };
type CatalogResponse = { vendors?: Vendor[]; markets?: Market[]; error?: string };

const days = [
  [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [0, "Sun"],
] as const;

function FilePreview({ file, label, onRemove }: { file: File; label: string; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <span className="vendor-file-preview"><Image src={url} alt={label} fill sizes="96px" unoptimized /><button type="button" aria-label={`Remove ${label}`} onClick={onRemove}><X /></button></span>;
}

export function AdminVendorManager() {
  const formRef = useRef<HTMLFormElement>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);

  async function loadCatalog() {
    setLoading(true); setError("");
    try {
      const response = await authenticatedFetch("/api/admin/vendors", { cache: "no-store" });
      const data = await response.json() as CatalogResponse;
      if (!response.ok) throw new Error(data.error || "Unable to load vendors.");
      setVendors(data.vendors || []); setMarkets(data.markets || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load vendors."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    authenticatedFetch("/api/admin/vendors", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() as CatalogResponse }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data.error || "Unable to load vendors.");
        setVendors(data.vendors || []); setMarkets(data.markets || []); setLoading(false);
      })
      .catch((reason) => { if (active) { setError(reason instanceof Error ? reason.message : "Unable to load vendors."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!logo || !images.length) { setError("Add a company logo and at least one listing image."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const data = new FormData(event.currentTarget);
      data.set("logo", logo);
      data.delete("images");
      images.forEach((image) => data.append("images", image));
      data.delete("availableDays");
      selectedDays.forEach((day) => data.append("availableDays", String(day)));
      const response = await authenticatedFetch("/api/admin/vendors", { method: "POST", body: data });
      const result = await response.json() as { error?: string; vendor?: { businessName: string } };
      if (!response.ok) throw new Error(result.error || "Unable to add vendor.");
      setMessage(`${result.vendor?.businessName || "Vendor"} and its first listing were added.`);
      formRef.current?.reset(); setLogo(null); setImages([]); setSelectedDays([1, 2, 3, 4, 5]); setShowForm(false);
      await loadCatalog();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to add vendor."); }
    finally { setSaving(false); }
  }

  async function setActive(vendor: Vendor, active: boolean) {
    setError(""); setMessage("");
    setVendors((current) => current.map((item) => item.id === vendor.id ? { ...item, active } : item));
    try {
      const response = await authenticatedFetch("/api/admin/vendors", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ vendorId: vendor.id, active }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update vendor status.");
      setMessage(`${vendor.businessName} is now ${active ? "active" : "inactive"}.`);
      await loadCatalog();
    } catch (reason) {
      setVendors((current) => current.map((item) => item.id === vendor.id ? { ...item, active: vendor.active } : item));
      setError(reason instanceof Error ? reason.message : "Unable to update vendor status.");
    }
  }

  return <div className="admin-vendor-manager">
    <div className="admin-vendor-toolbar"><div><h2>Vendor directory</h2><p>Add a complete marketplace listing and control its customer visibility.</p></div><button className="button button-primary" type="button" onClick={() => setShowForm((open) => !open)}>{showForm ? <X /> : <Plus />}{showForm ? "Close form" : "Add vendor"}</button></div>
    {(message || error) && <p className={`vendor-admin-message ${error ? "error" : "success"}`}>{error || message}</p>}

    {showForm && <form ref={formRef} className="admin-vendor-form" onSubmit={submit}>
      <header><div><small>NEW MARKETPLACE PARTNER</small><h2>Vendor and first listing</h2><p>Required fields are marked with an asterisk. You can keep the vendor inactive until everything is ready.</p></div><Store /></header>
      <fieldset><legend><span>1</span>Company details</legend><div className="vendor-form-grid">
        <label className="span-2">Business name *<input name="businessName" required maxLength={160} placeholder="Joyful Blooms" /></label>
        <label>Email<input name="email" type="email" placeholder="orders@vendor.com" /></label><label>Phone<input name="phone" type="tel" placeholder="(215) 555-0123" /></label>
        <label className="span-2">Company description *<textarea name="description" required rows={3} placeholder="What the company offers and what makes it special." /></label>
        <label>Website<input name="websiteUrl" type="url" placeholder="https://vendor.com" /></label><label>Marketplace *<select name="marketId" required defaultValue=""><option value="" disabled>Select a market</option>{markets.map((market) => <option key={market.id} value={market.id}>{market.name} · {market.city}, {market.state}{market.active ? "" : " (inactive)"}</option>)}</select></label>
        <label className="span-2">Street address<input name="address" placeholder="123 Market Street" /></label><label>City *<input name="city" required /></label><label>State *<input name="state" required maxLength={2} placeholder="PA" /></label><label>Postal code<input name="postalCode" inputMode="numeric" /></label><label>Service area notes<input name="serviceAreaNotes" placeholder="Philadelphia and nearby suburbs" /></label>
        <label className="span-2">Internal notes<textarea name="internalNotes" rows={2} placeholder="Visible only to PerkJoy admins" /></label>
      </div></fieldset>

      <fieldset><legend><span>2</span>Brand and listing images</legend><div className="vendor-media-grid">
        <div><b>Company logo *</b><label className="vendor-file-drop"><Upload /><span>Choose logo<small>JPG, PNG, or WebP · up to 8 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setLogo(event.target.files?.[0] || null)} /></label>{logo && <FilePreview file={logo} label="Company logo preview" onRemove={() => setLogo(null)} />}</div>
        <div><b>Listing photos * <small>{images.length}/6</small></b><label className="vendor-file-drop"><ImagePlus /><span>Choose photos<small>First image is the cover · up to 6</small></span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setImages(Array.from(event.target.files || []).slice(0, 6))} /></label><div className="vendor-preview-row">{images.map((image, index) => <FilePreview key={`${image.name}-${image.lastModified}`} file={image} label={`Listing photo ${index + 1}`} onRemove={() => setImages((current) => current.filter((_, position) => position !== index))} />)}</div></div>
      </div></fieldset>

      <fieldset><legend><span>3</span>First listing</legend><div className="vendor-form-grid">
        <label className="span-2">Listing name *<input name="productName" required maxLength={160} placeholder="Bright Day Bouquet" /></label><label>Category *<input name="category" required placeholder="Flowers" /></label><label>Serves people *<input name="servesPeople" type="number" min="1" required defaultValue="1" /></label>
        <label className="span-2">Listing description *<textarea name="productDescription" required rows={3} placeholder="Describe exactly what the customer receives." /></label>
        <label>Customer price *<span className="money-input"><i>$</i><input name="customerPrice" type="number" min="0" step="0.01" required /></span></label><label>Vendor cost *<span className="money-input"><i>$</i><input name="vendorCost" type="number" min="0" step="0.01" required /></span></label><label>Customer delivery fee *<span className="money-input"><i>$</i><input name="deliveryFee" type="number" min="0" step="0.01" required defaultValue="0" /></span></label><label>PerkJoy delivery cost *<span className="money-input"><i>$</i><input name="deliveryCost" type="number" min="0" step="0.01" required defaultValue="0" /></span></label><label>Platform fee *<span className="money-input"><i>$</i><input name="platformFee" type="number" min="0" step="0.01" required defaultValue="0" /></span></label><label>Rating *<input name="rating" type="number" min="0" max="5" step="0.1" required defaultValue="5" /></label>
        <label className="span-2">Preference tags<input name="preferenceTags" placeholder="birthday, flowers, local, same-day" /><small>Separate tags with commas.</small></label><label className="span-2">Options and customization notes<textarea name="optionNotes" rows={2} placeholder="Available sizes, flavors, colors, or personalization" /></label>
      </div></fieldset>

      <fieldset><legend><span>4</span>Availability and fulfillment</legend><div className="vendor-form-grid">
        <label>Minimum notice *<span className="unit-input"><input name="minimumNoticeHours" type="number" min="0" required defaultValue="48" /><i>hours</i></span></label><label>Lead-time label<input name="leadTimeText" defaultValue="48 hours notice" /></label><label>Fulfillment *<select name="fulfillmentMethod" defaultValue="vendor_delivery"><option value="vendor_delivery">Vendor delivery</option><option value="perkjoy_arranged">PerkJoy arranged</option><option value="pickup">Pickup</option><option value="third_party">Third-party delivery</option></select></label><label>Blackout dates<input name="blackoutDates" placeholder="2026-12-25, 2027-01-01" /><small>Use YYYY-MM-DD, separated by commas.</small></label><label>Delivery starts *<input name="deliveryStart" type="time" required defaultValue="09:00" /></label><label>Delivery ends *<input name="deliveryEnd" type="time" required defaultValue="17:00" /></label>
        <div className="span-2 vendor-day-picker"><b>Available days *</b><div>{days.map(([value, label]) => <button key={value} className={selectedDays.includes(value) ? "selected" : ""} type="button" onClick={() => setSelectedDays((current) => current.includes(value) ? current.filter((day) => day !== value) : [...current, value])}><Check />{label}</button>)}</div></div>
        <div className="vendor-check"><input id="vendor-delivery-available" name="deliveryAvailable" type="checkbox" value="true" defaultChecked /><label htmlFor="vendor-delivery-available">Delivery available<small>This listing can be delivered to customers.</small></label></div><div className="vendor-check"><input id="vendor-featured" name="featured" type="checkbox" value="true" /><label htmlFor="vendor-featured">Featured vendor<small>Prioritize this partner in curated experiences.</small></label></div><div className="vendor-check span-2"><input id="vendor-active" name="active" type="checkbox" value="true" /><label htmlFor="vendor-active">Publish as active<small>Leave off to save the vendor and listing without showing them to customers.</small></label></div>
      </div></fieldset>
      <footer><p><Building2 /> This creates the vendor, product, market availability, and marketplace listing together.</p><button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Plus />}{saving ? "Adding vendor…" : "Add vendor and listing"}</button></footer>
    </form>}

    <section className="admin-vendor-directory">
      {loading ? <p className="vendor-directory-empty"><LoaderCircle className="spin" /> Loading vendors…</p> : vendors.length === 0 ? <p className="vendor-directory-empty"><Store /> No vendors yet. Add the first marketplace partner.</p> : vendors.map((vendor) => <article key={vendor.id}>
        <span className="vendor-directory-logo">{vendor.logoUrl ? <Image src={vendor.logoUrl} alt={`${vendor.businessName} logo`} fill sizes="52px" unoptimized /> : <Store />}</span>
        <div><span className="vendor-name-line"><b>{vendor.businessName}</b>{vendor.featured && <em>Featured</em>}</span><small><MapPin /> {vendor.marketName} · {vendor.location || "Location pending"}</small><small>{vendor.email || "No contact email"}</small></div>
        <span className="vendor-listing-count"><b>{vendor.activeListingCount}/{vendor.listingCount}</b><small>active listings</small></span>
        <label className={`vendor-status-toggle ${vendor.active ? "active" : ""}`}><input type="checkbox" checked={vendor.active} onChange={(event) => void setActive(vendor, event.target.checked)} /><span><Power />{vendor.active ? "Active" : "Inactive"}</span></label>
      </article>)}
    </section>
  </div>;
}
