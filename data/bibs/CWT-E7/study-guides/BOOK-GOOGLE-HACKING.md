# Bib Study Guide — Google Hacking for Penetration Testers (Long, Gardner, Brown) 3rd Edition

> **Bib reference:** *Google Hacking for Penetration Testers*, 3rd Edition — Johnny Long, Bill Gardner, Justin Brown (Syngress, 2015, ISBN 978-0-12-802982-9).
>
> **Regular-exam scope:** Study topic on **enumeration**.
> **Substitute-exam scope:** Chapters 2, 3.
> **Union — what this guide covers:** Ch 2 (Advanced operators and Google-fu basics), Ch 3 (Google hacking basics — building working queries), and the general **enumeration** workflow that leverages search engines to discover target surface.

**Posture:** "Google dorking" is passive OSINT — the target receives no packets. The attacker queries Google (or Bing, Duck, Yandex, Shodan, Censys, FOFA) for pages, files, and configs they shouldn't find but somehow Google indexed. Pairs with `BOOK-HACKER-TECH.md` Ch 7 (enumeration) and `JCAC-ACTIVE-EXPLOIT.md` §3 (recon phase).

---

## Ch 2 — Advanced operators

### The core operators

| Operator | Meaning |
|---|---|
| `site:` | Restrict to a domain |
| `intitle:` | Term in `<title>` |
| `allintitle:` | All following terms in title |
| `inurl:` | Term in URL |
| `allinurl:` | All terms in URL |
| `intext:` | Term in body |
| `allintext:` | All terms in body |
| `filetype:` | File extension |
| `ext:` | Same as filetype |
| `cache:` | Google's cached version |
| `link:` | Pages linking to (deprecated, partial replacement via `inurl:`) |
| `related:` | Similar sites |
| `info:` | Site info summary |
| `daterange:` | Julian-date range (rarely useful now; UI filters replaced) |
| `numrange:` | Number range (e.g., `numrange:100-200`) |
| `define:` | Definition (non-hacking use) |
| `-term` | Exclude term |
| `"exact phrase"` | Exact match |
| `term1 OR term2` | Alternation |
| `*` | Wildcard within a phrase |

### Combining operators

```
site:example.com intitle:"index of" "/admin"
site:example.com filetype:pdf confidential
site:*.example.com -site:www.example.com   (subdomains other than www)
inurl:admin intitle:login site:example.com
"internal use only" filetype:pdf
```

### What you can find with dorks (and defender cares)

- **Open directories** — `intitle:"index of"`.
- **Login pages** — `inurl:admin login` / `inurl:wp-admin`.
- **Backup files** — `filetype:bak` / `filetype:sql` / `filetype:zip` / `ext:conf "password"`.
- **Config files** — `filetype:env "DB_PASSWORD"`, `filetype:yml "database"`, `intitle:".env"`.
- **Credentials in files** — `filetype:xls "login" "password"` / `filetype:txt "password" site:example.com`.
- **Sensitive docs** — `filetype:pdf "confidential"` / `filetype:doc "SSN"` / `filetype:xlsx "patient"`.
- **Code repos exposed** — `inurl:.git/config` / `intitle:"Index of /.git"`.
- **Cameras / IoT** — `inurl:"view/view.shtml"` (Axis), `intitle:"network camera" inurl:index`.
- **Exposed consoles** — `inurl:"/phpinfo.php"` / `intitle:"phpMyAdmin"` / `intitle:"Apache HTTP Server Test Page"`.

### The Google Hacking Database (GHDB)

ExploitDB maintains the **GHDB** — a curated list of known-productive dorks: https://www.exploit-db.com/google-hacking-database

Categories:
- Footholds
- Files containing usernames
- Sensitive Directories
- Web Server Detection
- Vulnerable Files
- Vulnerable Servers
- Error Messages
- Files containing juicy info
- Files containing passwords
- Sensitive Online Shopping Info
- Network or Vulnerability Data
- Pages containing login portals
- Various Online Devices
- Advisories and Vulnerabilities

### Defender counterposture

- **robots.txt + `noindex` meta + `X-Robots-Tag: noindex`** — request crawlers skip. Malicious scrapers ignore; search engines honor.
- **Don't serve secrets from the web root** — `.env`, `.git`, backup `.sql`, `*.bak`.
- **Auth-protect index pages** — never `Indexes` on.
- **Monitor search engines** — self-search your domain regularly for leaks; use Google Alerts.
- **Request removal** — Google Search Console "Remove URL" tool for urgent leaks.
- **Shodan / Censys self-monitoring** — see what your perimeter exposes globally.

---

## Ch 3 — Google Hacking Basics (Building Working Queries)

### Query refinement workflow

1. **Start broad** — `site:target.com`.
2. **Narrow by content** — add `intext:"API key"` or `filetype:env`.
3. **Exclude noise** — `-site:www.target.com -intitle:error`.
4. **Use wildcards** — `"api_key = *"` (when full value varies).
5. **Quote exact strings** — phrases, version numbers, error text.
6. **Drill into subdomains** — `site:*.target.com -site:www.target.com`.
7. **Try related engines** — Bing has different index, sometimes reveals differently.
8. **Check archives** — Wayback Machine for pages Google no longer indexes.

### Finding versions via error pages

Error pages often display exact software versions, file paths, and internal hostnames:

- `"PHP Warning" site:target.com` — PHP stack traces.
- `"Microsoft VBScript runtime error" site:target.com` — IIS ASP errors.
- `"Warning: mysql_fetch_array()"` — SQL errors.
- `"Stack trace" site:target.com` — uncaught exceptions in Java/Python/etc.
- `intitle:"Apache HTTP Server Test Page" "It works!"` — default Apache installs.
- `intitle:"IIS Windows Server"` — default IIS.

### Finding cameras and IoT

```
inurl:"/view.shtml"                       (Axis cameras)
intitle:"network camera"
inurl:"ViewerFrame?Mode="                 (Panasonic)
inurl:"indexFrame.shtml"                  (AXIS)
intitle:"Live View" "axis"
```

### Finding VPN / remote access portals

```
inurl:"dana-na/auth/url_default"         (Pulse Secure / Ivanti)
intitle:"Citrix" inurl:"/Citrix/XenApp"
inurl:"/remote/login" "FortiGate"
intitle:"FortiGate" -"site:fortinet.com"
"Outlook Web App" inurl:/owa/
```

### Dorking for GitHub / code leaks

GitHub itself has a code search:

- `"DB_PASSWORD" filename:.env`
- `"private_key" extension:pem`
- `"AWS_SECRET_ACCESS_KEY"`
- `"BEGIN RSA PRIVATE KEY"`

Third-party tools index public GitHub for secrets: **truffleHog**, **gitleaks**, **GitGuardian**, **Trufflesniffer**. Defender side: pre-commit hooks + secret-scanning providers (GitHub's native, GitLab's, Bitbucket's).

---

## Enumeration — passive search-based workflow

### Phase 1 — passive footprint discovery

**Goal:** Enumerate every publicly-visible asset without sending packets to the target.

Tools:

| Tool | Purpose |
|---|---|
| **Google / Bing dorks** | Indexed content |
| **Shodan** | Port-scanned internet of services; `org:"Target Corp"` queries |
| **Censys** | TLS-cert-indexed internet |
| **FOFA / ZoomEye** | Chinese-language alternatives (different index sets) |
| **crt.sh / Censys CT** | Certificate Transparency logs — every cert issued for a domain |
| **SecurityTrails / DNSDumpster** | Historical DNS data |
| **theHarvester** | Pull emails, subdomains, hosts from public sources |
| **amass** | Subdomain discovery via many passive and active sources |
| **Hunter.io / EmailHunter** | Emails associated with a domain |
| **Wayback Machine** | Historical snapshots of pages |
| **Google Scholar** | Academic papers / leaked conference docs |
| **Pastebin / Doxbin search** | Leaked docs and credential dumps |
| **LinkedIn / company sites** | Employee list for phishing |

### Phase 2 — OSINT on people

For social-engineering and spearphishing targets:

- **LinkedIn** — job titles, tech stack hints ("Proficient with Cisco, Palo Alto, Splunk").
- **Company site leadership page** — C-suite names, photos, assistants.
- **Public records** — lawsuits, property, SEC filings.
- **Social media** — Twitter/X, Instagram, Reddit (hobby forums often reveal more than corporate).
- **Dark web dumps** — old breach data reuse.

### Phase 3 — infrastructure mapping

- **DNS enumeration** — see `BOOK-HACKER-TECH.md` DNS section.
- **Subdomain brute-force** — `amass`, `subfinder`.
- **Reverse DNS sweep** — IP range → PTRs.
- **ASN enumeration** — `whois AS-number` reveals all IP blocks a company owns.
- **BGP peers** — `bgpview.io`, `bgp.he.net` — upstream providers, route visibility.

### Phase 4 — service fingerprinting from passive data

- Shodan `product:"Microsoft-IIS/10.0"` → version inference without scanning.
- TLS cert fingerprinting (JA3 / JA3S) reveals server stacks.
- HTTP header archives from older Wayback snapshots.

### Defender side — attack-surface management

- **Continuous discovery** — self-scan with Shodan/Censys on your own IP ranges.
- **CT log monitoring** — alert on unexpected certs issued for your domain.
- **Brand protection** — watch for typosquatted / malicious lookalike domains.
- **External attack-surface management (EASM)** — commercial solutions (Randori, RiskIQ, CrowdStrike Falcon Surface).
- **Bug bounty / VDP** — encourage responsible disclosure of leaks found via dorking.

---

## Ethics and legal framing

Google dorking is **passive** — you're reading Google's index, not touching the target. But:

- **Authorization matters** — if you're a pentester, your Rules of Engagement should explicitly cover OSINT.
- **Downloading found material** — in some jurisdictions, accessing exposed-but-not-public resources can be a CFAA violation.
- **GDPR / privacy** — EU-held personal data triggers legal obligations even if "found on Google."
- **Stay in scope** — even when authorized, don't pivot into unauthorized scope just because Google showed it to you.

### OPSEC for the searcher

- **Don't search from attributable browsers** — your Google account makes queries traceable. Use a research account.
- **VPN / TOR** if your query patterns could expose investigative scope.
- **Burner email for Hunter.io, Shodan free tier, etc.** — they log.
- **Remember search-history retention** — Shodan queries are retained.

---

## Cross-book connections

- Ch 2 + 3 dorks ↔ `JCAC-ACTIVE-EXPLOIT.md` §3 (Target Development / Info Gathering).
- Enumeration workflow ↔ `BOOK-HACKER-TECH.md` (Ch 7 scan-phase context).
- Certificate Transparency ↔ `BOOK-TCPIP-GUIDE.md` TLS section · `JCAC-NETWORKING.md` §20 (TLS/HTTPS).
- MITRE ATT&CK: TA0043 Reconnaissance, T1593 Search Open Websites/Domains, T1596 Search Open Technical Databases.

---

## Exam-testable concepts (rapid-fire)

- **Operator to restrict results to a domain?** `site:`.
- **Operator to search file extensions?** `filetype:` (or `ext:`).
- **Operator to find exact title?** `intitle:`.
- **Operator to find URL contents?** `inurl:`.
- **Operator to find body text?** `intext:`.
- **Exclude a term?** Prefix with `-`.
- **Exact phrase?** Wrap in `"..."`.
- **Alternation operator?** `OR` (uppercase).
- **Wildcard within a phrase?** `*`.
- **Google dork database?** ExploitDB GHDB.
- **Search for open directories?** `intitle:"index of"`.
- **Internet-scan database?** Shodan (or Censys).
- **TLS cert transparency log search?** crt.sh.
- **Subdomain discovery tool aggregating many passive sources?** amass.
- **Email/host OSINT tool (CLI)?** theHarvester.
- **GitHub secrets-discovery tool?** truffleHog or gitleaks.
- **MITRE ATT&CK tactic for passive recon?** TA0043 Reconnaissance.
- **Primary defender control against search-engine leaks?** Don't serve secrets to the web in the first place (+ CSPM + attack-surface management).
- **Why passive OSINT is lower-risk for attackers than active scanning?** Target sees no packets; defender has no network-level signal.

---

## Cross-references

- **[Google Hacking for Penetration Testers, 3e](../references/Google%20Hacking%20for%20Penetration%20Testers,%203rd%20Edition-9780128029824.pdf)** — text on disk.
- **[Google Hacking Database](https://www.exploit-db.com/google-hacking-database)** — ExploitDB's catalog.
- **[Shodan](https://www.shodan.io/)** · **[Censys](https://search.censys.io/)** · **[crt.sh](https://crt.sh/)**.
- **[Wayback Machine](https://web.archive.org/)** · **[SecurityTrails](https://securitytrails.com/)**.
- **[amass](https://github.com/owasp-amass/amass)** · **[theHarvester](https://github.com/laramies/theHarvester)**.
- **[MITRE ATT&CK — Reconnaissance (TA0043)](https://attack.mitre.org/tactics/TA0043/)**.
- `BOOK-HACKER-TECH.md` · `JCAC-ACTIVE-EXPLOIT.md` · `BOOK-CYBER-OPS.md`.
