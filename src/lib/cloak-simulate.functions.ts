import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SimProfile =
  | "fb_crawler"
  | "human_mobile_fb"
  | "human_desktop"
  | "datacenter"
  | "reused_fbclid"
  | "low_coherence"
  | "blocked_country";

type SimInput = { short_code: string; profile: SimProfile; fbclid?: string };

const PROFILES: Record<SimProfile, {
  ua: string;
  ip: string;
  country: string;
  asn: string;
  referer: string;
  acceptLang: string;
  secChUa: string;
  secChMobile: string;
  isHard: boolean;
  isDC: boolean;
  isMobile: boolean;
  coherence: number;
}> = {
  fb_crawler: {
    ua: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    ip: "69.171.250.10", country: "US", asn: "32934",
    referer: "", acceptLang: "", secChUa: "", secChMobile: "",
    isHard: true, isDC: false, isMobile: false, coherence: 20,
  },
  human_mobile_fb: {
    ua: "Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 [FBAN/FB4A;FBAV/445.0.0]",
    ip: "103.85.20.45", country: "BD", asn: "24432",
    referer: "https://l.facebook.com/", acceptLang: "en-US,en;q=0.9,bn;q=0.8",
    secChUa: '"Chromium";v="120", "Not_A Brand";v="24"', secChMobile: "?1",
    isHard: false, isDC: false, isMobile: true, coherence: 95,
  },
  human_desktop: {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ip: "103.92.10.5", country: "BD", asn: "24432",
    referer: "https://www.facebook.com/", acceptLang: "en-US,en;q=0.9",
    secChUa: '"Chromium";v="120"', secChMobile: "?0",
    isHard: false, isDC: false, isMobile: false, coherence: 90,
  },
  datacenter: {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    ip: "54.210.10.10", country: "US", asn: "16509",
    referer: "", acceptLang: "en-US",
    secChUa: "", secChMobile: "?0",
    isHard: false, isDC: true, isMobile: false, coherence: 70,
  },
  reused_fbclid: {
    ua: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 [FBAN/FB4A]",
    ip: "103.85.20.99", country: "BD", asn: "24432",
    referer: "https://l.facebook.com/", acceptLang: "en-US",
    secChUa: '"Chromium";v="120"', secChMobile: "?1",
    isHard: false, isDC: false, isMobile: true, coherence: 92,
  },
  low_coherence: {
    ua: "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0",
    ip: "103.85.20.50", country: "BD", asn: "24432",
    referer: "", acceptLang: "",
    secChUa: "", secChMobile: "",
    isHard: false, isDC: false, isMobile: false, coherence: 35,
  },
  blocked_country: {
    ua: "Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36",
    ip: "5.45.10.10", country: "RU", asn: "9009",
    referer: "https://l.facebook.com/", acceptLang: "ru-RU,ru;q=0.9",
    secChUa: '"Chromium";v="120"', secChMobile: "?1",
    isHard: false, isDC: false, isMobile: true, coherence: 88,
  },
};

export const simulateRedirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SimInput) => d)
  .handler(async ({ data, context }) => {
    // admin only
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const p = PROFILES[data.profile];
    if (!p) throw new Error("Unknown profile");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link } = await supabaseAdmin
      .from("links")
      .select("id, user_id, adsterra_url, safe_url, is_active, short_code")
      .eq("short_code", data.short_code)
      .maybeSingle();
    if (!link) throw new Error("Link not found");

    const fbclid = data.fbclid || (data.profile === "fb_crawler" ? null : `sim_${Date.now()}`);
    const fp = `sim_${data.profile}_${link.id}`;

    const { data: decision } = await (supabaseAdmin.rpc as any)("evaluate_redirect", {
      _link_id: link.id,
      _user_id: link.user_id,
      _short_code: data.short_code,
      _fbclid: fbclid,
      _fingerprint: fp,
      _ip: p.ip,
      _country: p.country,
      _asn: p.asn,
      _ua: p.ua,
      _referer: p.referer,
      _is_mobile: p.isMobile,
      _is_hard_bot: p.isHard,
      _is_datacenter: p.isDC,
      _coherence_score: p.coherence,
    });

    return {
      profile: data.profile,
      decision: decision?.decision ?? "safe",
      reasons: decision?.reasons ?? [],
      safe_url: decision?.safe_url ?? link.safe_url,
      money_url: link.adsterra_url,
      inputs: {
        ua: p.ua, ip: p.ip, country: p.country, asn: p.asn,
        is_hard_bot: p.isHard, is_datacenter: p.isDC, is_mobile: p.isMobile,
        coherence: p.coherence, fbclid,
      },
    };
  });
