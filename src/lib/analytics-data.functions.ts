import { createServerFn } from "@tanstack/react-start";
import { emptyAnalytics, loadAnalyticsData } from "@/lib/analytics.server";
import { getRequestAuth } from "@/lib/request-auth.server";
import { checkPaidAccess } from "@/lib/plan-gate.server";

export const getAnalyticsData = createServerFn({ method: "GET" })
  .handler(async () => {
    const t0 = Date.now();
    let stage = "auth";
    try {
      const context = await getRequestAuth();
      const tAuth = Date.now();

      stage = "plan-gate";
      const gate = await checkPaidAccess(context.supabase, context.userId);
      const tGate = Date.now();

      if (!gate.allowed) {
        console.log(`[analytics] locked user=${context.userId} plan=${gate.plan} auth=${tAuth - t0}ms gate=${tGate - tAuth}ms`);
        return { ...emptyAnalytics(), locked: true, plan: gate.plan };
      }

      stage = "load-rpc";
      const data = await loadAnalyticsData(context);
      const tDone = Date.now();

      console.log(
        `[analytics][OK] user=${context.userId} total=${tDone - t0}ms auth=${tAuth - t0}ms gate=${tGate - tAuth}ms rpc+transform=${tDone - tGate}ms`,
      );
      return { ...data, locked: false, plan: gate.plan };
    } catch (err: any) {
      const dt = Date.now() - t0;
      const msg = err?.message ?? String(err);
      const code = err?.code ?? err?.cause?.code ?? null;
      const details = err?.details ?? err?.hint ?? null;
      console.error(
        `[analytics][FAIL] stage=${stage} after=${dt}ms code=${code} msg=${msg} details=${details}`,
      );
      // Surface a structured error so the client sees the real cause
      throw new Error(`[${stage}] ${msg}${code ? ` (code=${code})` : ""}${details ? ` — ${details}` : ""}`);
    }
  });
