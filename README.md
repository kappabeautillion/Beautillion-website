# Beautillion Leadership Academy — Website

A static, dependency-free website (plain HTML/CSS/JS — no build step, no npm install
required) for the Beautillion Leadership Academy. Built to be hosted on Vercel and
edited by the committee through a simple visual editor (Decap CMS) at `/admin`.

## What's in this project

```
index.html, about/, program/, beaux/, alumni/, sponsors/, news/, gallery/, apply/
    → the 9 pages (each is its own folder with an index.html, except Home)
assets/css/style.css   → the whole design system (colors, type, layout, components)
assets/js/main.js      → nav, animations, content loading, gallery, form handling
assets/img/crest.png   → your official crest
content/*.json         → editable page content (news posts, alumni, beaux roster,
                          sponsors, gallery photos, home page text)
admin/                 → the Decap CMS editor (config.yml + index.html)
api/auth.js, api/callback.js → sign-in for the CMS editor (Vercel functions)
_build/                → my working files (templates + generator script) used to
                          assemble the 9 pages consistently. Not required to host
                          the site — safe to ignore, but keep it so future edits to
                          the shared header/footer can be regenerated across all
                          pages at once instead of by hand, 9 times.
```

Because there's no build step, what you see in these files is exactly what gets
served — nothing to compile, nothing that can fail to build.

## 1. Put this on GitHub

Vercel deploys from a Git repository, and Decap CMS commits content changes to
that same repository.

1. Create a new **private** GitHub repository, e.g. `beautillion-website`.
2. Push this folder to it:
   ```
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/beautillion-website.git
   git push -u origin main
   ```

## 2. Deploy to Vercel

1. Go to vercel.com, sign up/log in (GitHub login is easiest), click **Add New →
   Project**, and import the `beautillion-website` repo.
2. Vercel will detect it as a static site — leave the build settings as the
   defaults (no build command needed) and click **Deploy**.
3. You'll get a live URL like `beautillion-website.vercel.app` within about a
   minute. That's your site, live on the internet.

## 3. Connect www.kappabeautillion.com (GoDaddy → Vercel)

1. In the Vercel project, go to **Settings → Domains** and add
   `www.kappabeautillion.com`. Also add the bare `kappabeautillion.com` and set
   it to redirect to the `www` version.
2. Vercel will show you the exact DNS records to add (the values can vary by
   project, so use what Vercel shows you, not values from any other guide):
   - A record for `@` (the bare domain) → the IP address Vercel displays
   - CNAME record for `www` → `cname.vercel-dns.com`
3. In GoDaddy: go to **My Products → DNS** for kappabeautillion.com, and:
   - Delete the default "Parked" A record GoDaddy created for `@`
   - Delete any `AAAA` records for `@`
   - Add the A record and CNAME record from step 2
4. DNS changes usually take effect within an hour, sometimes up to 48 hours.
   Vercel will show a green checkmark next to the domain once it's live, and
   issues a free SSL certificate automatically.

## 4. Set up committee editing (Decap CMS)

This gives your committee a simple, visual editor at
`www.kappabeautillion.com/admin` — no code, just forms — for news posts, the
Beaux roster, alumni stories, sponsor logos, gallery photos, and the home page
text. (Note: I've asked Claude will make bigger structural or design changes,
since I'm on this. Decap covers the everyday content additions/edits.)

1. **Update `admin/config.yml`**: replace `YOUR_GITHUB_USERNAME/beautillion-website`
   with your actual repo, and `base_url` with your live domain.
2. **Create a GitHub OAuth App**: on GitHub, go to
   **Settings → Developer settings → OAuth Apps → New OAuth App**, and set:
   - Homepage URL: `https://www.kappabeautillion.com`
   - Authorization callback URL: `https://www.kappabeautillion.com/api/callback`
   Save it, then generate a **client secret**.
3. **Add environment variables in Vercel**: in your Vercel project, go to
   **Settings → Environment Variables** and add:
   - `OAUTH_CLIENT_ID` = the Client ID from the GitHub OAuth App
   - `OAUTH_CLIENT_SECRET` = the Client secret you generated
   Redeploy after adding these (Vercel will prompt you).
4. Visit `www.kappabeautillion.com/admin`, click **Login with GitHub**, and
   authorize the app. Anyone you want to be able to edit the site needs to be
   a collaborator on the GitHub repo (add them under the repo's **Settings →
   Collaborators**).
5. Editing a page and clicking **Publish** in Decap commits the change to
   GitHub, which automatically triggers a new Vercel deployment — the live
   site updates within about a minute.

## 5. Apply page — connecting it, and what still needs real infrastructure

`/apply/` is a full multi-step application (9 steps: Applicant Info, Parent/
Guardian, Academics, Activities & Service, College & Career, Short Responses,
Documents, Authorizations & Signatures, Review & Submit). The step logic,
word-count-limited essays, repeatable activity/service/employment/award
entries, drag-and-drop document staging, drawn electronic signatures, the
review screen, and validation all run in `assets/js/apply.js` — no backend
required for any of that.

Two pieces, by design, work differently than a fully-built product would:

**a) Submissions go through Formspree, for now — per your decision**

Because this form asks for sensitive family information (date of birth, home
address, transcripts), I flagged that up front: the two real options were
(1) hold submissions until secure storage exists, or (2) route through
Formspree the same way the Support and Apply-adjacent forms already do. You
chose Formspree, so that's what's wired up:

1. Create a form at formspree.io (a second one, separate from any you made
   for Support the Academy).
2. Enable file attachments on the form if you want uploaded transcripts and
   other documents to arrive as email attachments.
3. In `apply/index.html` (and `_build/fragments/apply.html`, then re-run
   `python3 _build/generate.py`), replace `YOUR_FORM_ID` in
   `<form id="apply-form-el" action="https://formspree.io/f/YOUR_FORM_ID">`
   with your real form ID.
4. Set up the two emails below in Formspree's notification and autoresponder
   settings.

**Please read this before turning it on:** transcripts and family contact
information will land in a regular inbox via Formspree until real secure,
access-controlled storage exists (see (c) below). That's the tradeoff you
chose to get applications flowing sooner — just make sure whoever manages
that inbox understands they're handling sensitive student records.

*Email #1 — to kappabeautillion@gmail.com — "New Academy Application —
{{Applicant Full Name}} — Class of {{Application Year}}"*
Include: applicant name, applicant email, applicant phone, parent/guardian
name, parent/guardian email, high school, current grade, expected graduation
year, submission date and time, confirmation number, document status. Set
this as the form's notification subject line; Formspree already includes
every submitted field in the body.

*Email #2 — to the applicant and parent/guardian — "We Received Your
Beautillion Leadership Academy Application"*

```
Dear {{Applicant First Name}},

Thank you for applying to the Beautillion Leadership Academy. Your
application has been received successfully.

Confirmation number: {{Confirmation Number}}
Application cycle: {{Application Year}}
Submission date: {{Submission Date}}

Our team will review your application and contact you regarding next
steps. Please retain this message for your records.

Questions may be directed to: kappabeautillion@gmail.com

Sincerely,
Beautillion Leadership Academy
```

Set this as Formspree's Autoresponder message. A secure link or PDF copy of
the submitted application (excluding internal administrative fields, like
the custody/access-considerations note) would need the backend in (c) below
to generate reliably — for now, the on-screen confirmation page lets a
family download a plain-text summary immediately after submitting.

**b) "Save and Finish Later" saves to this browser only — per your decision**

You chose browser-local autosave over waiting for real accounts. Progress is
saved automatically (and on demand via "Save and Finish Later") to the
visitor's own browser storage, so refreshing or closing the tab won't lose
their work *on that same device*. It will **not** follow them to a different
device, and there's no email verification or password-reset flow, because
those need real accounts and a database. If a family loses their progress by
switching devices or clearing their browser, they'll need to start over.

**c) What still needs a real backend (not built, and shouldn't be faked)**

- **Secure, access-controlled document storage** with virus scanning —
  transcripts and other uploads should live somewhere access-controlled, not
  a public URL or a shared inbox. This needs an actual file-storage service
  (e.g., a private Vercel Blob store or S3 bucket) plus a scanning step.
- **Real accounts and cross-device save-and-return** with email
  verification, unpredictable secure links, and password-reset — needs a
  database and an auth provider.
- **Admin dashboard** — the "secure administrator link" mentioned in the
  brief, plus searching/filtering applications, needs the same database as
  above.
- **Automated reminder emails** (application started but not submitted,
  transcript missing, parent signature missing, interview scheduling,
  deadline approaching) need a scheduled job reading real application state
  from a database — there's no "half-finished application" record anywhere
  but the applicant's own browser right now, so nothing can be triggered
  server-side.
- **A real, server-generated PDF copy** of the submitted application (for
  the applicant email attachment and the download button) — today's
  confirmation number and download are generated in the browser as a
  placeholder, not from an authoritative source.

This is the same category of work as the Support the Academy page's admin
dashboard — worth treating as its own follow-on project once you're ready,
rather than something bolted on here as a placeholder.

## 6. Photos

Every photo on the site is currently a labeled placeholder (a dark panel with
text describing what should go there) so you can review layout and design
before real photography is ready. To add a real photo anywhere, either:

- Use the Decap CMS editor (`/admin`) — most content types (news, alumni,
  beaux, sponsors, gallery) have an image upload field that replaces the
  placeholder automatically, or
- Send me (Claude) the photo and tell me where it goes.

For the **Beaux page** specifically — once you share access to the Google
Drive folder with headshots, I'll pull them in directly.

## 7. Support the Academy (sponsorship) page — next steps

The `/sponsors/` page (nav label "Support the Academy") collects sponsor
information, a tier selection, artwork, and a payment-method preference.
The form itself is built and working end-to-end except for three pieces
that need real accounts/credentials I intentionally never handle for you:

**a) Sponsor info + artwork, via Formspree (same setup as Apply)**

1. In your formspree.io account, create a second form (or reuse one) for
   sponsorships.
2. In `sponsors/index.html` (and `_build/fragments/sponsors.html`, then
   re-run `python3 _build/generate.py`), replace `YOUR_FORM_ID` in
   `<form id="support-form-el" action="https://formspree.io/f/YOUR_FORM_ID">`
   with the real form ID.
3. Formspree's paid plans support file attachments — enable that on the
   form if you want artwork files to arrive as email attachments rather
   than just a filename.
4. Turn on Formspree's **email notification** for the new-submission alert
   (Email #1) and its **Autoresponder** feature for the sponsor's thank-you
   (Email #2). Suggested copy for each, matching what you specified:

   *Email #1 — to kappabeautillion@gmail.com — "New Sponsorship Submitted"*
   Include: sponsor name, payment amount/tier, participant supported
   ("Advertisement in Support of"), special instructions, a confirmation
   number, the date, and either the attached artwork or "Artwork Pending."
   Formspree's notification email already includes every submitted field
   automatically — just set the subject line to "New Sponsorship Submitted"
   in the form's settings.

   *Email #2 — to the sponsor — "Thank You for Supporting the Beautillion
   Leadership Academy"*
   Include: their name, a receipt-style summary, donation amount, selected
   sponsorship tier, confirmation number, artwork status, and what to
   expect next. Formspree's Autoresponder supports `{{field_name}}`
   placeholders pulled straight from the submitted fields.

**b) Real payment processing (never stores card data)**

The page collects a payment-method *preference* (Credit Card / Debit Card
/ PayPal) but does not charge anyone yet — no payment processor is
connected. The right way to add this without ever handling card numbers
yourselves is **Stripe Checkout**: Stripe hosts the actual payment page,
so card data never touches this codebase.

1. Create a Stripe account and add a Product + Price for each tier
   (Bronze $50, Silver $100, Gold $250, Diamond $1,000).
2. I can add a small Vercel serverless function (same pattern as
   `api/auth.js`) that creates a Stripe Checkout Session and redirects the
   sponsor there after they submit the form — tell me when you're ready
   and share the Stripe publishable/secret keys through Vercel's
   environment variables (never in chat).
3. PayPal works similarly via PayPal's own hosted Checkout/Smart Buttons,
   if you'd rather offer that instead of or alongside Stripe.

**c) Admin dashboard (searchable sponsorship list, artwork approval,
Excel export, Diamond cover-placement reservations)**

This is a separate, larger project from the public-facing page — it needs
a real database (submissions currently only land in your email inbox via
Formspree, with nothing to search/filter/export on the site itself) plus
a login-protected admin view. We're deliberately scoping this as its own
follow-on build rather than a placeholder bolted onto this page. Ask
Claude when you're ready to start it.

Until (a) and (b) are connected, the sponsorship form shows a message
that submissions aren't yet being sent or charged, rather than silently
failing.

## 8. Making future changes

- **Day-to-day content** (new alumni story, new sponsor, new gallery photo,
  new class of Beaux, a news update): use `/admin`, or just ask Claude.
- **Design or structural changes** (new page, new section, layout tweaks):
  ask Claude — I have the full source and can edit it directly.
