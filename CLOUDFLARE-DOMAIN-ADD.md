# Cloudflare এ Domain Add করার Step-by-Step (adspx.com)

> মোট সময়: ১০–১৫ মিনিট (DNS propagation আলাদা)।
> আগে থেকে যা আছে: VPS `109.205.180.183`, SSL issued (Let's Encrypt), Nginx running।

---

## Step 1 — Cloudflare account + site add

1. https://dash.cloudflare.com/sign-up → Free plan-এ sign up (already থাকলে login)।
2. Dashboard → **Add a site** → `adspx.com` লিখো → **Continue**।
3. Plan: **Free → Continue**।
4. Cloudflare auto-scan করে existing DNS records দেখাবে → **Continue**।

---

## Step 2 — DNS records verify

Cloudflare DNS table-এ এই records থাকা **মাস্ট**, না থাকলে add করো:

| Type | Name | Content              | Proxy        |
| ---- | ---- | -------------------- | ------------ |
| A    | `@`  | `109.205.180.183`    | 🟠 Proxied   |
| A    | `www`| `109.205.180.183`    | 🟠 Proxied   |
| A    | `api`| `109.205.180.183`    | ⚪ DNS only  |

> ⚠️ **`api` subdomain অবশ্যই DNS only (grey cloud)** — Supabase API proxied হলে WebSocket/realtime ভাঙবে এবং upload limit এ আটকাবে।

**Continue** → Cloudflare ২টা nameserver দিবে, যেমন:
```
xxx.ns.cloudflare.com
yyy.ns.cloudflare.com
```

---

## Step 3 — Domain registrar এ nameserver বদলাও

যেখান থেকে domain কিনেছো (Namecheap / GoDaddy / Hostinger / etc.) সেখানে login:

1. Domain List → `adspx.com` → **Manage** / **DNS**।
2. **Nameservers** section → "Custom" select করো।
3. পুরোনো nameserver মুছে Cloudflare-এর ২টা nameserver বসাও → **Save**।

প্রোপাগেশন: ৫ মিনিট – ২৪ ঘণ্টা (সাধারণত ১৫–৩০ মিনিট)।

চেক করার কমান্ড (VPS থেকে):
```bash
dig NS adspx.com +short
```
Cloudflare nameserver দেখালে done।

---

## Step 4 — Cloudflare SSL/TLS settings

Active হওয়ার পর dashboard → `adspx.com` সাইটে যাও:

1. **SSL/TLS → Overview** → **Full (strict)** select করো।
   > Origin-এ Let's Encrypt valid SSL আছে, তাই strict safe।
2. **SSL/TLS → Edge Certificates**:
   - **Always Use HTTPS:** ON
   - **HTTP Strict Transport Security (HSTS):** Enable (max-age 6 months, includeSubDomains ON)
   - **Minimum TLS Version:** TLS 1.2
   - **Opportunistic Encryption / TLS 1.3 / Automatic HTTPS Rewrites:** ON

---

## Step 5 — Cache + Speed config

পুরো গাইড `CLOUDFLARE-CACHE-SETUP.md` ফাইলে আছে। সংক্ষেপে:

- **Caching → Configuration → Browser Cache TTL:** Respect Existing Headers
- **Caching → Tiered Cache:** Smart Tiered Cache ON
- **Speed → Optimization:**
  - Brotli: ON
  - Auto Minify: JS + CSS + HTML
  - Early Hints: ON
- **Network:** HTTP/3 ON, 0-RTT ON, WebSockets ON

তারপর **Caching → Cache Rules** → `CLOUDFLARE-CACHE-SETUP.md` এর ৪টা rule add করো (Bypass API rule অবশ্যই সবার উপরে)।

---

## Step 6 — Firewall / Security (optional but recommended)

- **Security → Bots → Bot Fight Mode:** ON
- **Security → Settings → Security Level:** Medium
- **Security → WAF → Managed Rules:** Cloudflare Managed Ruleset ON
- **DDoS protection:** Default ON (Free plan-এ auto)

---

## Step 7 — Verify (VPS থেকে)

```bash
# Nameserver propagated?
dig NS adspx.com +short

# Proxied? (Cloudflare IP দেখাবে, not 109.205.180.183)
dig adspx.com +short

# SSL working?
curl -sI https://adspx.com | head -5

# Cache hit check
chmod +x /var/www/adspx/scripts/cache-check.sh
/var/www/adspx/scripts/cache-check.sh adspx.com
```

`cf-cache-status: HIT` দেখলে cache কাজ করছে।

---

## Common issues

| সমস্যা                                  | সমাধান                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| `Error 521 Web server is down`          | Origin (Nginx) down — `systemctl status nginx` + `pm2 status`                   |
| `Error 525 SSL handshake failed`        | SSL mode "Full (strict)" এ Let's Encrypt cert expired — `certbot renew`         |
| API call CORS error                     | `api.adspx.com` proxied হয়ে গেছে → DNS only (grey cloud) করো                    |
| Logo/CSS old version দেখাচ্ছে            | Caching → Configuration → **Purge Everything** ক্লিক                            |
| `Too many redirects`                    | SSL mode "Flexible" এ আছে → **Full (strict)** এ বদলাও                            |
