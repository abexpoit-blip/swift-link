// Public server-side Supabase RPC client using plain fetch — avoids
// supabase-js realtime WebSocket dependency (breaks on Node.js < 22).

function getPublicConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    const missing = [
      ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
      ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY / ANON_KEY"] : []),
    ];
    throw new Error(`Missing public database env: ${missing.join(", ")}`);
  }
  return { supabaseUrl, publishableKey };
}

type RpcResult<T> = { data: T | null; error: { message: string } | null };

export function getAdspxPublicClient() {
  const { supabaseUrl, publishableKey } = getPublicConfig();
  const headers = {
    apikey: publishableKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  return {
    rpc: async <T = any>(fn: string, args: Record<string, any>): Promise<RpcResult<T>> => {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
          method: "POST",
          headers,
          body: JSON.stringify(args),
        });
        const text = await res.text();
        if (!res.ok) return { data: null, error: { message: `${res.status} ${text}` } };
        const data = text ? (JSON.parse(text) as T) : (null as any);
        return { data, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e?.message ?? String(e) } };
      }
    },
    from: (table: string) => {
      const filters: string[] = [];
      let selectCols = "*";
      let limitVal: number | undefined;
      const runner = {
        select(cols: string) { selectCols = cols; return runner; },
        eq(col: string, val: any) { filters.push(`${col}=eq.${encodeURIComponent(String(val))}`); return runner; },
        limit(n: number) { limitVal = n; return runner; },
        then(resolve: (r: RpcResult<any[]>) => void, reject?: (e: any) => void) {
          const qs = [
            `select=${encodeURIComponent(selectCols)}`,
            ...filters,
            ...(limitVal !== undefined ? [`limit=${limitVal}`] : []),
          ].join("&");
          fetch(`${supabaseUrl}/rest/v1/${table}?${qs}`, { headers })
            .then(async (res) => {
              const text = await res.text();
              if (!res.ok) return resolve({ data: null, error: { message: `${res.status} ${text}` } });
              resolve({ data: text ? JSON.parse(text) : [], error: null });
            })
            .catch((e) => (reject ? reject(e) : resolve({ data: null, error: { message: e?.message ?? String(e) } })));
        },
      };
      return runner;
    },
  };
}
