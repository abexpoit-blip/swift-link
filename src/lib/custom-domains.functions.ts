import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Custom Domains is a Lifetime-only feature.
const LIFETIME_PLANS = new Set(["lifetime", "unlimited"]);

const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;

function normalize(d: string) {
  return d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

async function assertPaid(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_slug")
    .eq("id", userId)
    .maybeSingle();
  const slug = (profile?.plan_slug ?? "free").toLowerCase();
  if (!LIFETIME_PLANS.has(slug)) {
    throw new Error("Custom Domains is a Lifetime-only feature. Upgrade to the Lifetime plan to add a domain.");
  }
}

export const listCustomDomains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_slug")
      .eq("id", userId)
      .maybeSingle();
    const slug = (profile?.plan_slug ?? "free").toLowerCase();
    const isPaid = LIFETIME_PLANS.has(slug);

    const { data, error } = await supabase
      .from("custom_domains")
      .select("id, domain, verification_token, verified, verified_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { domains: data ?? [], isPaid, planSlug: slug };
  });

export const addCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { domain: string }) =>
    z.object({ domain: z.string().min(3).max(253) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertPaid(supabase, userId);
    const domain = normalize(data.domain);
    if (!domainRegex.test(domain)) throw new Error("Invalid domain format (e.g. links.yoursite.com)");

    // M6 fix: RLS-scoped check missed other users' rows; use admin client for global uniqueness
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("custom_domains")
      .select("id, user_id")
      .eq("domain", domain)
      .maybeSingle();
    if (existing) {
      if (existing.user_id === userId) throw new Error("You have already registered this domain.");
      throw new Error("This domain is already registered by another account.");
    }

    // Generate verification token in app code (don't rely on DB default
    // which uses extensions.gen_random_bytes — may be missing on self-host).
    const tokenBytes = new Uint8Array(16);
    crypto.getRandomValues(tokenBytes);
    const verification_token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { data: inserted, error } = await supabase
      .from("custom_domains")
      .insert({ user_id: userId, domain, verification_token })
      .select("id, domain, verification_token, verified, created_at")
      .single();
    if (error) throw new Error(`Could not save domain: ${error.message}`);
    return inserted;
  });

export const verifyCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: row } = await supabase
      .from("custom_domains")
      .select("id, domain, verification_token, verified")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Domain not found.");

    // DNS TXT lookup via Cloudflare's public DoH (works in edge runtime)
    const txtName = `_sleepox-verify.${row.domain}`;
    const cnameName = row.domain;

    let txtOk = false;
    let cnameOk = false;
    let cnameTarget = "";

    try {
      const r = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtName)}&type=TXT`,
        { headers: { accept: "application/dns-json" } },
      );
      const j: any = await r.json();
      const answers: any[] = j?.Answer ?? [];
      txtOk = answers.some((a) =>
        String(a?.data ?? "")
          .replace(/^"|"$/g, "")
          .includes(row.verification_token),
      );
    } catch { /* ignore */ }

    try {
      const r = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cnameName)}&type=CNAME`,
        { headers: { accept: "application/dns-json" } },
      );
      const j: any = await r.json();
      const answers: any[] = j?.Answer ?? [];
      const match = answers.find((a) =>
        String(a?.data ?? "").toLowerCase().includes("sleepox.com"),
      );
      cnameOk = !!match;
      cnameTarget = match?.data ?? "";
    } catch { /* ignore */ }

    if (!txtOk) {
      return {
        ok: false,
        message: `TXT record not found. Add a TXT record at ${txtName} with value: ${row.verification_token}`,
        txtOk,
        cnameOk,
        cnameTarget,
      };
    }
    if (!cnameOk) {
      return {
        ok: false,
        message: `CNAME record not pointing to sleepox.com. Add a CNAME at ${row.domain} → sleepox.com`,
        txtOk,
        cnameOk,
        cnameTarget,
      };
    }

    await supabase
      .from("custom_domains")
      .update({ verified: true, verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", row.id);

    return { ok: true, message: "Domain verified successfully!", txtOk, cnameOk, cnameTarget };
  });

export const deleteCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase
      .from("custom_domains")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
