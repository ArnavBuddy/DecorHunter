<div align="center">

# 🏡 HomeDecor Buyer Finder

### Find real US home decor buyers. Verify their emails. Reach out, responsibly.

![Next.js](https://img.shields.io/badge/Next.js-App_Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-Prisma-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![CAN-SPAM](https://img.shields.io/badge/CAN--SPAM-Compliant-22C55E?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-MVP-8B5CF6?style=for-the-badge)

<br />

<img src="docs/screenshots/find-buyers.png" alt="Find Buyers page" width="90%" />

</div>

---

## ✨ What is this?

**HomeDecor Buyer Finder** is a web app that turns a simple search like *"home decor store in Austin, TX"* into a verified list of business contacts, and lets you send compliant outreach emails to the ones you choose.

It works as a four-stage funnel:

```
   🔍 FIND   ──▶   🧩 ENRICH   ──▶   ✅ VERIFY   ──▶   📧 SEND
 live APIs        who to contact     does the email    throttled, with
 (no CSVs!)       at each business   really exist?      unsubscribe built in
```

> **No CSV uploads.** Every lead comes from a live API call.

---

## 🖼️ Screenshots

> The screenshots below use sample data.

### 🔍 Find Buyers
Search by keyword, cities, and states. Popular US cities are one click away.

<img src="docs/screenshots/find-buyers.png" alt="Find Buyers" width="100%" />

### 📋 Leads
Every discovered contact, with a verification status, confidence score, and location. Filter by `all`, `unverified`, `valid`, `risky`, or `invalid`.

<img src="docs/screenshots/leads.png" alt="Leads" width="100%" />

### ✉️ New Campaign
Write the template with variables, pick your contacts, and send.

<img src="docs/screenshots/new-campaign.png" alt="New Campaign" width="100%" />

---

## 🚀 Features

| | Feature | What it does |
|---|---|---|
| 🔎 | **Multi-API discovery** | Searches several providers in parallel through one common adapter interface |
| 🧹 | **Normalize and dedupe** | Merges results, removes duplicates by domain, keeps US businesses only |
| 🎯 | **Role-aware enrichment** | Finds contacts at each business, preferring buyer, owner, and purchasing roles |
| ✅ | **Email verification** | Marks each address `valid`, `risky`, or `invalid` before anything is sent |
| 🧑‍⚖️ | **Human review step** | Nothing is sent automatically; you choose the recipients |
| ✍️ | **Template variables** | `{{company}}`, `{{first_name}}`, `{{unsubscribe_link}}` |
| 🐢 | **Throttled sending** | Queue with delays and a daily cap to protect deliverability |
| 🚫 | **Suppression list** | Bounced, complained, and unsubscribed addresses are never emailed again |
| 🔐 | **Server-side keys** | API keys never reach the browser |
| 🧪 | **Dry-run mode** | On by default; emails go only to your test address |

---

## 🧠 How it works

```mermaid
flowchart LR
    A[🔍 Search<br/>keywords + cities + states] --> B[Lead Sources<br/>Google Places · Apollo · Yelp]
    B --> C[🧹 Normalize<br/>and Dedupe]
    C --> D[🧩 Enrich<br/>Hunter Domain Search]
    D --> E[✅ Verify<br/>Hunter Verifier / ZeroBounce]
    E --> F[🧑‍⚖️ Review<br/>and Select]
    F --> G[📬 Send Queue<br/>Resend / SendGrid]
    G --> H[🪝 Webhooks<br/>bounce · complaint · unsubscribe]
    H --> I[(🚫 Suppression List)]
    I -. checked before every send .-> G
```

### Data model

```mermaid
erDiagram
    LEADS ||--o{ CONTACTS : has
    CAMPAIGNS ||--o{ MESSAGES : sends
    CONTACTS ||--o{ MESSAGES : receives
    LEADS {
        string company_name
        string website
        string domain
        string city
        string state
        string source
    }
    CONTACTS {
        string name
        string title
        string email
        string email_status
        int confidence
    }
    CAMPAIGNS {
        string name
        string subject
        string body_template
        string status
    }
    MESSAGES {
        string status
        string provider_message_id
        datetime sent_at
    }
    SUPPRESSION_LIST {
        string email
        string reason
    }
```

---

## 🧰 Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Database | PostgreSQL + Prisma |
| Queue | BullMQ + Redis (or a DB-backed job table for the MVP) |
| Email | Resend (SendGrid or Brevo also work) |
| Validation | Zod |
| Data APIs | Google Places, Apollo.io, Hunter.io, ZeroBounce, Yelp Fusion (optional) |

---

## 💻 Run it locally

### 1. Prerequisites

- **Node.js 18.17+** (20 LTS recommended). Check with `node -v`.
- **npm** (comes with Node), or pnpm/yarn.
- **PostgreSQL 14+**, either installed locally or a free cloud database from [Neon](https://neon.tech) or [Supabase](https://supabase.com).
- **Git**.
- API keys (see step 4). The free tiers are enough to try the app.

### 2. Clone and install

```bash
git clone https://github.com/ArnavBuddy/homedecor-buyer-finder.git
cd homedecor-buyer-finder
npm install
```

### 3. Set up the database

Pick **one** option.

**Option A: Docker (easiest)**

```bash
docker run --name homedecor-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=homedecor \
  -p 5432:5432 -d postgres:16
```

Your connection string is then:
`postgresql://postgres:postgres@localhost:5432/homedecor`

**Option B: Cloud Postgres**
Create a free project on Neon or Supabase and copy its connection string.

### 4. Configure environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

```env
# --- Database ---
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/homedecor"

# --- Lead discovery ---
GOOGLE_PLACES_KEY=""     # console.cloud.google.com → enable Places API
APOLLO_KEY=""            # apollo.io → Settings → API
YELP_KEY=""              # optional, yelp.com/developers

# --- Email finding and verification ---
HUNTER_KEY=""            # hunter.io → API
ZEROBOUNCE_KEY=""        # optional, zerobounce.net

# --- Sending ---
RESEND_KEY=""            # resend.com → API Keys
FROM_EMAIL="you@your-verified-domain.com"
FROM_NAME="Your Name"
POSTAL_ADDRESS="123 Main St, City, State, ZIP"   # required in every email (CAN-SPAM)

# --- Safety ---
DRY_RUN=true             # keep true until you are ready to send for real
TEST_EMAIL="you@example.com"   # in dry-run mode, all mail goes here

# --- App ---
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

### 5. Create the tables

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 6. Start the app

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. 🎉

### 7. Try the full flow

1. Go to **Find Buyers**, enter `home decor store`, add a city like *Austin* and the state *TX*, and click **Find Buyers**.
2. Open **Leads** to see the discovered contacts. Run verification and filter by status.
3. Click **Create Campaign**, or open **New Campaign** from the sidebar.
4. Write your subject and body, then pick contacts.
5. With `DRY_RUN=true`, click send. Mail goes only to your `TEST_EMAIL`.
6. Open the email and click the unsubscribe link to confirm it works.

---

## 🧪 Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server at `localhost:3000` |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npx prisma studio` | Browse your database in the browser |
| `npx prisma migrate reset` | Wipe and recreate the database (dev only) |
| `npm run lint` | Run the linter |

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `Can't reach database server` | Make sure Postgres or Docker is running and `DATABASE_URL` is correct |
| `Prisma Client not found` | Run `npx prisma generate` |
| Search returns 0 results | Check that `GOOGLE_PLACES_KEY` is set and the Places API is enabled in Google Cloud |
| Leads have no emails | Hunter and Apollo free plans limit email access and credits. Check your quota |
| Port 3000 already in use | Run `npm run dev -- -p 3001` |
| Emails not arriving | Confirm your sending domain is verified in Resend and `DRY_RUN` / `TEST_EMAIL` are set as intended |
| `Module not found` after pulling | Delete `node_modules` and `.next`, then run `npm install` again |

---

## ⚖️ Responsible use and compliance

This tool is built to follow the **US CAN-SPAM Act** and good email practice:

- ✅ Every email has a working **unsubscribe link** and a **physical postal address**
- ✅ Honest subject lines and a real sender identity
- ✅ The **suppression list** is checked before every send
- ✅ Business contacts only, from public or API-provided sources
- ✅ Send from a dedicated domain with **SPF, DKIM, and DMARC** set up, and ramp volume up slowly
- ✅ Respect each API's **terms of service** and rate limits

**Start in `DRY_RUN` mode and send to yourself first.** Only email real prospects once you are sure the content, sender identity, and compliance setup are right.

---

## 🗂️ Project structure

```
homedecor-buyer-finder/
├── docs/screenshots/        # README images
├── prisma/
│   └── schema.prisma        # leads, contacts, campaigns, messages, suppression_list
├── src/
│   ├── app/
│   │   ├── search/          # Find Buyers
│   │   ├── leads/           # Leads table + filters
│   │   ├── campaigns/       # New Campaign + campaign list
│   │   ├── unsubscribe/     # One-click opt-out
│   │   └── api/             # Server route handlers (keys stay here)
│   ├── lib/
│   │   ├── sources/         # LeadSource adapters (Google Places, Apollo, Yelp)
│   │   ├── enrich/          # Hunter domain search
│   │   ├── verify/          # Email verification
│   │   ├── email/           # Resend client + templates
│   │   └── queue/           # Throttled send queue
│   └── components/
├── .env.example
└── README.md
```

> The tree above shows the planned layout. Adjust it to match your repo.

---

## 🗺️ Roadmap

- [ ] Bulk verification with progress bar
- [ ] Follow-up email sequences
- [ ] Open and click analytics
- [ ] More lead sources
- [ ] Export campaign reports

---

## 🤝 Contributing

Pull requests are welcome. Open an issue first to discuss big changes.

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

<div align="center">

Built by [**@ArnavBuddy**](https://github.com/ArnavBuddy)

⭐ Star the repo if you found it useful!

</div>
