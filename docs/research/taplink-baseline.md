# Raw research — Taplink competitor baseline

Observation date for all claims: **2026-09-16** unless a different date is given inline.
Purpose: evidence base for the SIS competitor-analysis deliverables. This is a raw research file,
not a submission document.

## 0. How to read this file — verification tiers

The single largest risk in this project is citing a number nobody checked. Every claim below carries a tier.

| Tier | Meaning | Trust for submission |
|---|---|---|
| **A — primary, self-verified** | Raw HTML/text fetched and inspected directly; quoted verbatim from the source bytes. | Citable as fact. |
| **B — primary, agent-fetched** | A research agent fetched the live page and reported quoted text, but a summarising model sat between the page and the quote. | Citable with the URL; re-check before it becomes load-bearing. |
| **C — secondary / snippet** | Search-result snippets, third-party SEO/review-aggregator sites, or AI summaries of pages that could not be opened. | **Do not cite.** Listed only to record what was attempted. |

Anything that could not be established is in §8 as `UNVERIFIED` rather than estimated.

---

## 1. Headline finding — Taplink is already a Kazakhstan legal entity (Tier A)

The operator named in Taplink's own Russian-market privacy policy is a **Kazakhstan LLP**, not a Russian company.

Verbatim from the raw HTML of `https://taplink.ru/about/privacy.html`:

> "Настоящая Политика проводится **ТОО Мелентьева H.A.** (далее — «Организация») в отношении обработки и обеспечения защиты персональных данных физических лиц."

`ТОО` (товарищество с ограниченной ответственностью) is the Kazakhstani limited-liability form. The same
document applies Kazakh law throughout:

> "…осуществлять возложенные на Организацию законодательством **Республики Казахстан** функции в соответствии с законом **«О персональных данных и их защите»** и иными законами и нормативными правовыми актами КЗ…"

> "…в соответствии с действующим законодательством **Республики Казахстан** и международным соглашениям применительно к полученным им данным."

Mentions of Russia, Russian Federal Law 152-FZ, server locations, or data-storage jurisdiction in that
document: **zero** (checked by string search over the extracted text — `Россий`, `152-ФЗ`, `сервер`,
`хранени` all return 0 hits).

The English-language policy at `https://taplink.at/en/about/privacy.html` names **no operating entity at all**
and no storage jurisdiction; it references GDPR/EEA only.

**Why this matters for Dükan.** The intuitive pitch — "Taplink is a foreign product that ignores Kazakhstan" —
is factually wrong at the corporate layer and a reviewer could puncture it. The defensible and sharper claim is:

> Kazakhstan is Taplink's jurisdiction of registration, yet Kazakhstan is not a market Taplink serves as a product:
> no KZT pricing, no Kazakh-language interface, and no Kazakhstani payment rail (§4, §5).

That gap — legally domestic, commercially absent — is a stronger wedge than "foreign competitor", and every
half of it is sourced.

**Note for the team:** "Мелентьева" matches Taplink founder surname Melentyev. Whether this ТОО is a
post-2022 redomiciliation from Russia is **UNVERIFIED** — plausible but not evidenced. Do not assert it.
A KZ business-registry (`stat.gov.kz` / `kgd.gov.kz`) lookup for the BIN would settle it; the privacy policy
carries no BIN or address.

---

## 2. Pricing (Tier B — `https://taplink.ru/pricing/` and `https://taplink.at/pricing/`)

Pages are client-rendered Vue SPAs; raw HTML contains no prices. Figures were obtained through a
reader-proxy render of the live pages.

### 2.1 taplink.ru — RUB

| Tier | List / month | With 12-month prepay | Annual total |
|---|---|---|---|
| Basic | 0 ₽ (free forever) | — | 0 ₽ |
| Pro | 225 ₽ | 90 ₽ | 1 080 ₽ |
| Business ("Самый популярный") | 725 ₽ | 290 ₽ | 3 480 ₽ |

Billing toggle offered: 1 month / 3 months (−20%) / 12 months (−60%).

### 2.2 taplink.at — USD (international)

| Tier | List / month | Annual (discounted) |
|---|---|---|
| Basic | free forever | — |
| Pro | $4.00 | $96 → **$48/yr** |
| Business | $8.00 | $192 → **$96/yr** |

### 2.3 Feature gating (both domains agree)

| Capability | Basic | Pro | Business |
|---|---|---|---|
| Unlimited links, ready-made themes, QR, page-view stats | ✅ | ✅ | ✅ |
| Click analytics, price lists, custom HTML, media blocks, pixels | — | ✅ | ✅ |
| **Lead-capture forms** | — | — | ✅ |
| **Accept payments** | — | — | ✅ |
| **Remove Taplink branding** | — | — | ✅ |
| **Custom domain + SSL** | — | — | ✅ |
| CRM, automated emails, online store, online-kassa | — | — | ✅ |

Two structural facts worth carrying into the deliverable:

1. **Branding removal and custom domain are top-tier-only.** Most link-in-bio competitors unlock branding
   removal at their cheapest paid tier. A Taplink Pro customer at 225 ₽/mo still displays Taplink's logo.
2. **Order capture is top-tier-only.** Forms *and* payments are both Business-only — a Basic or Pro user
   cannot take an order at all. For a DM-selling audience this is the entire job-to-be-done sitting behind
   the most expensive plan.
3. **One paid plan = one Instagram profile** ("Один профиль Instagram — один тариф"), transferable between
   profiles but not shared.

**Internal inconsistency found (Tier B):** the RU pricing FAQ text describes discounts of "30% и 50%" for
half-year/annual, while the live billing toggle on the same page offers 3-month (−20%) and 12-month (−60%)
with no 6-month option. The FAQ copy is stale relative to the UI. Evidence that the billing structure was
restructured recently; the date of that change is UNVERIFIED.

**Discrepancy to flag, not resolve (Tier B):** the RU page states 0% payment commission for Business, while
the international page lists a "Transaction fee" for the same tier. Which is authoritative is UNVERIFIED.

---

## 3. Free-tier (Basic) limits (Tier B)

- **No cap on links or blocks.** "Неограниченное количество ссылок" / "Unlimited links" is an explicit Basic feature.
- **No page-view or visitor cap** stated anywhere on the pricing or FAQ pages.
- **Analytics:** page views only. No click analytics.
- **Taplink branding is mandatory on Basic *and* Pro** — removal is Business-only.
- **No custom domain** on Basic or Pro.
- **No forms, no payments, no CRM** on Basic or Pro.

So the free tier is generous on *quantity* (unlimited links) and absolute on *commerce* (zero order capture).

---

## 4. Payment rails — the core gap (Tier A)

Taplink's own help centre lists a per-provider setup guide for every payment system it supports. The full
index of `https://taplink.ru/help/faq/settings/payments/` (pages 1–3) contains setup articles for:

> ЮMoney (ex-Яндекс.Деньги) · Робокасса · Free-Kassa · PayPal · Тинькофф Касса · CloudPayments ·
> ЮКасса (ex-Яндекс.Касса) · Payeer · Сбербанк / Альфабанк acquiring · МодульБанк · PayAnyWay

A case-insensitive search across that entire index for `kaspi | каспи | halyk | халык | freedom | казахст |
тенге | KZT` returns **0 hits on every page**.

Two further Tier-A observations from the same help centre:

- The payments FAQ is framed entirely around **Russian** legal and fiscal concepts: "Для приёма платежей,
  обязательно ли наличие **ИП**?", and multiple articles on **онлайн-касса** (the Russian 54-FZ fiscal-receipt
  requirement).
- Taplink's own subscription billing runs through **TipTop Pay**, Visa/Mastercard only. Verbatim from
  `https://taplink.ru/about/payments.html`: "Наш сайт подключен к интернет-эквайрингу, и Вы можете оплатить
  Услугу банковской картой Visa или Mastercard… откроется защищенное окно с платежной страницей
  процессингового центра **TipTop Pay**."

**Conclusion (safe to submit):** Taplink supports eleven payment providers, all Russian rails plus PayPal,
and zero Kazakhstani rails. Kaspi Pay — the dominant consumer payment method in Kazakhstan — is not
integrable. A KZ seller on Taplink Business can technically accept a Visa/Mastercard payment but cannot
accept the payment method their buyers actually use.

This is the single strongest, best-evidenced differentiator available to Dükan.

**Not claimed:** that Kaspi integration is impossible or refused. Absence from the docs is absence of
evidence of support, which for a documented-integration product is strong but not absolute. Phrase as
"no documented support", not "does not support".

---

## 5. Localisation gap (Tier B)

`hreflang` alternates on taplink.ru/pricing/ enumerate: en, es, fr, de, id, ru, pt-br, tr, hi, it, az,
es-mx, pt, ja, zh-cn. There is **no `kk` (Kazakh) locale and no KZT currency variant**. Azerbaijani is
present; Kazakh is not. KZ users are served either RUB pricing (taplink.ru) or USD pricing (taplink.at).

Also established (Tier B): `taplink.cc` is a profile-hosting/vanity-URL domain only, not a marketing site —
`taplink.cc/pricing` and `taplink.cc/tariffs` resolve to ordinary user-registered profile pages.

---

## 6. User complaints — evidence (Tier B, Capterra only)

Capterra aggregate at access: **4.8/5 from 296 reviews**. Treat the positivity skew as sampling bias
(vendor-prompted reviews); the value is in the complaints embedded inside otherwise-positive reviews.

Complaint clusters, each with at least one named, dated reviewer:

| # | Cluster | Evidence |
|---|---|---|
| C1 | **Subscription expiry silently breaks the live page** | Christi V., 4★, 2023-03-14: "certain features had been turned off… our subscription had expired but we didn't receive any notifications that this was expiring." James M., 2★, 2023-01-27 ("Locked Out"): "I wasn't able to renew my billing method and rather than giving me the opportunity to change it the system locked me out." |
| C2 | **Basic blocks gated behind paid tiers** | Rebecca D., 4★, 2023-01-27: "Some of the basic blocks (e.g. images) are only available on higher tiers." Megan T., 5★, 2023-01-31: "colour is not available without paying." Sydney P., 2021-10-05: "Free account appearance subpar compared to pro version." |
| C3 | **Editor friction / data loss** | Krysia H., 2021-10-01: "Taking down an older post in the slider to free up space for a new post caused me to loose all my links." Kim B., 2021-09-23: "I had to use HTML coding to have photos." Guacimara G., 4★, 2021-10-06: "Difficult to find the erase click for sections created." |
| C4 | **Desktop rendering is an afterthought** | Marcos A., 5★, 2021-09-29: "Page is optimized for mobile devices (portrait mode)… looks weird on large displays." Blessing A., 5★, 2021-09-29: wants "a more presentable web view version… not just the mobile view." |
| C5 | **Thin analytics** | Vasiliy P., 5★, 2023-02-21: "doesn't have a special hub to monitor the stats… such as views and click throughs." |
| C6 | **Dated templates** | Tasha B., 3★, 2021-09-22: "The designs are quite basic… The layouts feel quite outdated." |
| C7 | **Payments unavailable in some regions** | Mariam O., 5★, 2021-10-05: "Payment option is not available. This is a major set back." |
| C8 | **No usable native mobile app** | Chantea H., 2021-09-28 wishes for a mobile app; Matthew P., 2023-02-05: "Can't seem to download the QR on the mobile device." A Google Play search surfaced no official Taplink app — only lookalikes and clones. |

All quotes: `https://www.capterra.com/p/235736/Taplink/reviews/`, accessed 2026-09-16.

C1 and C7 are the ones that pair with the payment-rail gap to make a coherent product story.

---

## 6A. The gap is industry-wide, not Taplink-specific (Tier A)

Researched alongside Taplink: **Linktree, Beacons.ai, Stan.store, Milkshake, Carrd**. The decisive
axis for a KZ seller is not features — it is whether they can receive money at all.

### Stripe does not support Kazakhstan (Tier A, self-verified)

`https://stripe.com/global` was fetched and its full supported-country list extracted. Kazakhstan
appears **zero times** in the page text. The complete list is:

> Australia, Austria, Belgium, Brazil, Bulgaria, Canada, Côte d'Ivoire*, Croatia, Cyprus, Czech Republic,
> Denmark, Estonia, Finland, France, Germany, Ghana*, Gibraltar, Greece, Hong Kong, Hungary, India†,
> Indonesia†, Ireland, Italy, Japan, Kenya*, Latvia, Liechtenstein, Lithuania, Luxembourg, Malaysia, Malta,
> Mexico, Netherlands, New Zealand, Nigeria*, Norway, Poland, Portugal, Romania, Singapore, Slovakia,
> Slovenia, South Africa*, Spain, Sweden, Switzerland, Thailand, United Arab Emirates, United Kingdom,
> United States
> (* = "Extended network", † = "Preview")

Kazakhstan is absent from core, Preview, and Extended network alike. So are Armenia, Georgia and
Uzbekistan — this is a regional exclusion, not a Kazakhstan-specific one. Stripe's own page directs
non-supported countries to Stripe Treasury/stablecoins or Stripe Atlas (incorporate a US company) —
i.e. the documented workaround is "register a foreign legal entity", which is not viable for an
Instagram seller.

**Consequence:** any competitor whose native checkout is Stripe-backed cannot onboard a KZ seller for
payouts. Stan.store is confirmed Stripe-reliant; Linktree, Beacons and Milkshake route commerce through
Stripe/PayPal (Milkshake's published selling fees sit on top of "Stripe's processing fee").

### PayPal in Kazakhstan — genuinely disputed, do not state flatly (Tier A on the doc, disputed in reality)

PayPal's official Payouts country-feature reference
(`https://developer.paypal.com/docs/payouts/standard/reference/country-feature/`) lists:

> "Kazakhstan | Send, receive, and withdraw | KZ"

**But the scope of that table is the Payouts API (mass disbursement), not general PayPal
Business/merchant-checkout eligibility.** Multiple PayPal Community threads and secondary aggregators
report KZ users unable to receive or withdraw on ordinary personal/business accounts.

Two of this project's own research notes contradict each other on this point — one records PayPal KZ as
settled "send-only", the other as disputed. **The disputed framing is correct.** For submission, write:
"PayPal merchant receive/withdraw capability for Kazakhstan is contested between PayPal's own Payouts
documentation and user reports; UNVERIFIED pending a live test." Do not assert "send-only".

### Competitor matrix — KZ seller payout viability

| Tool | Native checkout rail | KZ seller can receive? | Tier |
|---|---|---|---|
| Taplink | 11 providers, all RU rails + PayPal (§4) | No local rail; no Kaspi | A |
| Linktree | Stripe / PayPal | No (Stripe excludes KZ) | A on Stripe, B on tool |
| Beacons.ai | Stripe / PayPal | No (Stripe excludes KZ) | A on Stripe, B on tool |
| Stan.store | Stripe (confirmed reliant) | No | A on Stripe, B on tool |
| Milkshake | Stripe + 7–12% selling fee | No | A on Stripe, B on tool |
| Carrd | Stripe / PayPal | No | A on Stripe, B on tool |

**No local KZ rail (Kaspi Pay, local card acquiring) was found on any of the six tools surveyed.**

Corroborating failure mode (Tier B): a Stan.store user in another Stripe-unsupported country
(Egypt, incident 2025-06-17, review 2025-07-23) earned $101 and could not withdraw it — "I feel scammed."
Same mechanism a KZ seller would hit.

**Correction logged:** an earlier pass in this research wrongly concluded Milkshake was abandoned and
owned by Bumble, after fetching two dead legacy domains. The live product is `https://milkshake.app`,
developer **Codelbee Pty Ltd**, with current pricing (Free / Lite $2.99 / Pro $6.99 / Pro+ $10 per month).
"Milkshake by Bumble" is stale framing — do not repeat it.

---

## 7. Derived wedges for Dükan (inference, not sourced fact — label as such in deliverables)

| ID | Wedge | Rests on |
|---|---|---|
| W1 | Local payment rails (Kaspi first) | §4 + §6A — Tier A. Strongest wedge: no surveyed competitor has a KZ rail, and Stripe structurally excludes KZ. |
| W2 | Order capture available from the free tier, not gated to the top plan | §2.3 — Tier B |
| W3 | KZT pricing and Kazakh/Russian bilingual UI | §5 — Tier B |
| W4 | WhatsApp order handoff as the primary flow, not a link block | §4 + thesis in CLAUDE.md |
| W5 | Don't silently break a paid page on expiry — grace period + notification | §6 C1 — Tier B |

W1 is the load-bearing one and it is the best-evidenced. Build the pitch on W1.

---

## 8. UNVERIFIED register — do not cite any of these

| Item | Status |
|---|---|
| Trustpilot rating | Conflicting secondary claims (4.8 / 4.7 / 3.3). Page unreachable in 4 attempts (Cloudflare). **UNVERIFIED.** |
| G2 rating and complaint list | HTTP 403 on every attempt. **UNVERIFIED.** |
| iOS App Store rating ("4.7") | Listing never located; guessed app IDs 404'd. **UNVERIFIED.** |
| Reddit / X / Threads sentiment | Zero coverage — search budget exhausted, old.reddit.com unfetchable. **NOT ACCESSED.** |
| Historical price points (2023–2024) | Wayback stores only the empty SPA shell; prices load client-side and were never captured. Page confirmed to exist since 2023-11-27 with 18 distinct content digests through 2026-06-29, but no price numbers recoverable. **UNVERIFIED.** |
| "Data stored in Russia" | **Investigated and not supported.** The policy names a KZ entity and KZ law and says nothing about storage location. Do not repeat this claim. |
| Whether ТОО Мелентьева Н.А. is a redomiciliation from Russia | **UNVERIFIED** — plausible, unevidenced. |
| DTF article's "$30–90/year" Taplink cost figures | Do not reconcile with the site's own 1 080 ₽ / 3 480 ₽ annual prices (≈$12/$39). Likely workaround costs or annualised list price. **UNVERIFIED, do not cite.** |
| Tier assignment of "Поддержка внешней аналитики" | Checkmarks render as icons; lost in text extraction. **UNVERIFIED.** |
| PayPal merchant receive/withdraw in KZ | Payouts-API docs say "send, receive, withdraw"; user reports say otherwise. Scope mismatch. **UNVERIFIED / disputed** — needs a live KZ Business account test. |
| Whether KZT pricing / local rails are planned | No evidence found. Treat as an open gap, not a confirmed "no". |

---

## 9. Sources

All accessed 2026-09-16.

| # | URL | Tier | Used for |
|---|---|---|---|
| S1 | https://taplink.ru/about/privacy.html | A | §1 legal entity, KZ law |
| S2 | https://taplink.at/en/about/privacy.html | A | §1 no entity named, GDPR only |
| S3 | https://taplink.ru/help/faq/settings/payments/ (pages 1–3) | A | §4 payment providers, zero KZ rails |
| S4 | https://taplink.ru/about/payments.html | A | §4 TipTop Pay, Visa/MC |
| S5 | https://taplink.ru/pricing/ | B | §2.1, §2.3, §3 |
| S6 | https://taplink.at/pricing/ | B | §2.2 |
| S7 | https://www.capterra.com/p/235736/Taplink/reviews/ | B | §6 |
| S8 | https://appsumo.com/products/taplink-2021/reviews/ | B | 4.9/5, 117 reviews; no negatives in retrieved excerpt |
| S9 | https://taplink.cc/pricing , https://taplink.cc/tariffs | B | §5 .cc is profile hosting only |
| S10 | https://web.archive.org/cdx/search/cdx?url=taplink.ru/pricing/ | B | §8 capture history |
| S11 | https://stripe.com/global | A | §6A Stripe excludes KZ (full list extracted) |
| S12 | https://developer.paypal.com/docs/payouts/standard/reference/country-feature/ | A | §6A PayPal KZ row, Payouts-API scope |
| S13 | https://milkshake.app | B | §6A Milkshake live pricing, Codelbee Pty Ltd |

## 10. Open follow-ups

1. Re-attempt Trustpilot / G2 / App Store with a working browser tool — three rating numbers are currently uncitable.
2. Reddit / X pass once search quota resets (`site:reddit.com taplink`).
3. KZ business-registry lookup for ТОО Мелентьева Н.А. to get BIN, registration date, address.
4. Confirm Kaspi Pay's own integration/API posture for third-party storefronts — needed before claiming W1 is buildable.
