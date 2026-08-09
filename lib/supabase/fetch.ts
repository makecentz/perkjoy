"use client";

import { createBrowserSupabaseClient } from "./browser";

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;
  if (!data.session?.access_token) {
    throw new Error("Sign in to open your PerkJoy workspace.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);

  return fetch(input, { ...init, headers });
}

