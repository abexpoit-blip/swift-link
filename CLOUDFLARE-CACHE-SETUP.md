# Cloudflare Cache Rules — adspx.com

দুটো লেয়ার লাগবে:
1. **Origin (Nginx)** ঠিক `Cache-Control` header পাঠাবে।
2. **Cloudflare** সেই header দেখে edge-এ cache করবে + extra rules।

---

## 1) Nginx — origin cache headers

`/etc/nginx/sites-available/adspx` এর `server { ... }` ব্লকের ভিতরে যোগ করো (যদি আগে থেকে না থাকে):

```nginx
# Static assets — long cache, immutable (Vite hashed filenames)
location ~* ^/_build/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    access_log off;
}

# Public images / icons / fonts (filename stable)
location ~* \.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot)$ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000" always;
    access_log off;
}

# HTML — must revalidate (SSR pages)
location / {
    add_header Cache-Control "public, max-age=0, must-revalidate" always;
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Reload: `nginx -t && systemctl reload nginx`

---

## 2) Cloudflare DNS

Dashboard → DNS → `adspx.com` A record `109.205.180.183` → **Proxy: ON (orange cloud)**।
SSL/TLS mode: **Full (strict)**।

---

## 3) Cloudflare Cache Rules

Dashboard → **Caching → Cache Rules → Create rule**

### Rule 1 — Static assets aggressive cache
- **Name:** Static assets
- **If incoming requests match:** `URI Path` `matches regex` `\.(css|js|mjs|png|jpg|jpeg|webp|avif|svg|ico|woff2?|ttf|otf|gif)$`
- **Then:**
  - Cache eligibility: **Eligible for cache**
  - Edge TTL: **Override** → `1 month`
  - Browser TTL: **Override** → `1 month`

### Rule 2 — Build output (hashed)
- **Name:** Build files
- **If:** `URI Path` `starts with` `/_build/`
- **Then:**
  - Edge TTL: `1 year`
  - Browser TTL: `1 year`

### Rule 3 — HTML / SSR pages (short cache + SWR)
- **Name:** HTML pages
- **If:** `URI Path` `does not match regex` `\.[a-z0-9]+$` (i.e. no file extension)
- **Then:**
  - Cache eligibility: **Eligible**
  - Edge TTL: `2 minutes`
  - Browser TTL: `Respect origin`
  - Serve stale while revalidate: **ON**

### Rule 4 — Bypass API
- **Name:** Bypass API
- **If:** `Hostname` `equals` `api.adspx.com` OR `URI Path` `starts with` `/api/`
- **Then:** Cache eligibility: **Bypass cache**

> Rules order: **Rule 4 (bypass) সবার উপরে রাখো**, তারপর 2 → 1 → 3।

---

## 4) Cloudflare extra performance (Speed → Optimization)

- **Brotli:** ON
- **Auto Minify:** JS + CSS + HTML ON
- **Early Hints:** ON
- **HTTP/3 (QUIC):** ON
- **0-RTT Connection Resumption:** ON
- **Tiered Cache:** ON (Caching → Tiered Cache → Smart Tiered Cache Topology)

---

## 5) Verify (deploy ar pore VPS theke)

```bash
# Origin header check
curl -sI https://adspx.com/adspx-logo.png | grep -i cache-control
curl -sI https://adspx.com/ | grep -i cache-control

# Cloudflare edge check (CF-Cache-Status: HIT expected after 2nd hit)
curl -sI https://adspx.com/adspx-logo.png | grep -i cf-cache-status
curl -sI https://adspx.com/adspx-logo.png | grep -i cf-cache-status  # 2nd hit
```

`cf-cache-status: HIT` দেখলে সব ঠিক আছে।

---

## 6) Purge after deploy

প্রতিবার নতুন build deploy করার পর Cloudflare → Caching → Configuration → **Purge Everything** ক্লিক করো (অথবা শুধু `/` purge by URL)।
