# Donghan Fu — Academic Homepage

Modern single-page academic homepage. Pure HTML/CSS/JS, no build step.
Auto-syncs Google Scholar citation counts via GitHub Actions daily.

## Live locally

```bash
cd site
python3 -m http.server 8080
# open http://localhost:8080
```

## Structure

```
site/
├─ index.html                    # All content
├─ CNAME                         # Custom domain (edit if changing)
├─ assets/
│  ├─ css/main.css               # Styles
│  ├─ js/main.js                 # Router, sub-tabs, Scholar fetch
│  └─ data/scholar-stats.json    # Refreshed daily by Actions
├─ images/                       # Photos, journal covers
├─ files/                        # CV PDF
├─ scripts/
│  ├─ fetch_scholar.py           # Google Scholar scraper
│  └─ requirements.txt
└─ .github/workflows/
   └─ update-scholar.yml         # Daily Scholar refresh workflow
```

---

## Deployment guide (GitHub Pages + custom domain)

### 1 · Prepare the repository

The site lives in the `site/` folder of this workspace. For GitHub Pages you
have two options:

**Option A (recommended) — user site at `<username>.github.io`:**
1. Create a public repo named exactly `donghan-fu.github.io` (or whatever your
   GitHub username is + `.github.io`).
2. Copy **everything inside** `site/` (not the folder itself) into the repo root.
3. Push.

**Option B — project site (any repo name):**
1. Create a public repo, e.g. `personal-homepage`.
2. Copy the contents of `site/` into the repo root.
3. Push.
4. GitHub Pages will serve at `<username>.github.io/personal-homepage/` — you
   may need to adjust any absolute paths (none used currently).

```bash
# from /Users/donghanfu/Desktop/生活/personal website
cd site
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:<your-username>/donghan-fu.github.io.git
git push -u origin main
```

### 2 · Enable GitHub Pages

1. Go to **Settings → Pages** in your repo.
2. Under **Source**, select **Deploy from a branch**.
3. Choose branch: `main`, folder: `/ (root)`.
4. Save. Pages will build; your site appears at
   `https://<username>.github.io/` in a minute.

### 3 · Enable Scholar auto-update (already configured)

The workflow `.github/workflows/update-scholar.yml` runs daily at 03:15 UTC.

1. Go to **Settings → Actions → General**.
2. Under **Workflow permissions**, select **Read and write permissions**. Save.
3. Go to the **Actions** tab, find **"Update Google Scholar stats"**, click
   **Run workflow → Run workflow** to trigger the first run manually.
4. After ~1 minute it commits an updated `assets/data/scholar-stats.json`. Your
   site will show the fresh numbers.

**Optional — avoid Google Scholar rate limits:**
Sign up for a free ScraperAPI key at https://www.scraperapi.com/ (5,000 free
requests/month). In **Settings → Secrets and variables → Actions**, add a
repository secret named `SCRAPER_API_KEY` with the value.

### 4 · Custom domain

The `CNAME` file at the repo root sets the domain. Currently it contains:

```
donghanfu.com
```

Change it to your actual domain if different, commit, push.

**DNS configuration at your registrar** (Namecheap, GoDaddy, Cloudflare, etc.):

For **apex domain** `donghanfu.com` — add four A records pointing to GitHub:
```
A   @   185.199.108.153
A   @   185.199.109.153
A   @   185.199.110.153
A   @   185.199.111.153
```

For **www subdomain** — add a CNAME:
```
CNAME   www   <your-username>.github.io.
```

Then in GitHub: **Settings → Pages → Custom domain** field, enter
`donghanfu.com`, save. Check **Enforce HTTPS** once DNS propagates (may take
15 min – 24 hr).

### 5 · Making updates

Edit `index.html` / `assets/css/main.css` locally, preview via
`python3 -m http.server`, commit, push. GitHub Pages redeploys in seconds.

---

## How Scholar sync works

Google Scholar has no official API and blocks direct browser fetches (CORS).
Standard approach:

1. GitHub Actions runs `scripts/fetch_scholar.py` daily (and on manual trigger).
2. The script uses the `scholarly` library to fetch the author profile at
   `user_id=MIEcV3oAAAAJ`, plus each publication and its citation count.
3. Results are written to `assets/data/scholar-stats.json` and committed back.
4. When any visitor loads the page, `assets/js/main.js` fetches that JSON and
   populates the sidebar (**Citations**, **h-index**, **i10-index**) plus the
   per-paper "Cited by N" badges on the Publications page.

Per-paper matching uses fuzzy keyword overlap — Scholar titles often include
subtitles or slightly different phrasing than the display titles on the site.
If a paper doesn't get matched (badge stays as "Cited by —"), edit the
`data-cite-title` attribute in `index.html` to include more distinctive words
from the Scholar title.

---

## Customizing

- **Text** — all content is in [index.html](index.html).
- **Colors, fonts, spacing** — CSS variables at the top of
  [assets/css/main.css](assets/css/main.css).
- **Publications** — a new paper needs two entries:
  1. In the **Research** section, add an `<article class="paper">` under the
     correct strand slide.
  2. In the **Publications** compact list, add an `<li>` with a
     `citation-badge` and a `data-cite-title`.
- **Scholar user ID** — set `SCHOLAR_USER_ID` in the workflow env (currently
  `MIEcV3oAAAAJ`).
