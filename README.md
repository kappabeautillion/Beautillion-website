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

## 5. Connect the Apply form

The application form on `/apply/` is wired for **Formspree** (a free service
that emails you form submissions with zero code):

1. Create a free account at formspree.io and create a new form.
2. Copy the form ID it gives you (looks like `xploqwer`).
3. In `apply/index.html` (and `_build/fragments/apply.html`, then re-run
   `python3 _build/generate.py`), replace `YOUR_FORM_ID` in the form's
   `action="https://formspree.io/f/YOUR_FORM_ID"` with your real ID.
4. Commit and push — submissions will start emailing to whoever set up the
   Formspree account.

Until this is connected, the form will show a message asking the visitor to
try again later rather than silently failing.

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

## 7. Making future changes

- **Day-to-day content** (new alumni story, new sponsor, new gallery photo,
  new class of Beaux, a news update): use `/admin`, or just ask Claude.
- **Design or structural changes** (new page, new section, layout tweaks):
  ask Claude — I have the full source and can edit it directly.
