import json, os, re

BUILD = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BUILD)

with open(os.path.join(BUILD, "header.html")) as f:
    HEADER_TPL = f.read()
with open(os.path.join(BUILD, "footer.html")) as f:
    FOOTER = f.read()

ACTIVE_KEYS = ["HOME", "ABOUT", "PROGRAM", "EXPERIENCE", "BEAUX", "ALUMNI", "SPONSORS", "NEWS", "GALLERY"]

def render_header(active_key):
    html = HEADER_TPL
    for key in ACTIVE_KEYS:
        token = "__ACTIVE_%s__" % key
        html = html.replace(token, "active" if key == active_key else "")
    return html

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
<meta name="description" content="{description}" />
<link rel="icon" href="/assets/img/crest.png" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:image" content="/assets/img/crest.png" />
<meta property="og:type" content="website" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css" />
</head>
<body>
{header}
<main id="main">
{body}
</main>
{footer}
{extra_scripts}
</body>
</html>
"""

def write_page(out_rel_path, title, description, active_key, body, extra_scripts=""):
    html = PAGE_TEMPLATE.format(
        title=title,
        description=description,
        header=render_header(active_key),
        body=body,
        footer=FOOTER,
        extra_scripts=extra_scripts,
    )
    out_path = os.path.join(ROOT, out_rel_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        f.write(html)
    print("wrote", out_path)

# ---------------------------------------------------------------
# Standard hand-authored pages (fragments/*.html -> pages.json)
# ---------------------------------------------------------------
with open(os.path.join(BUILD, "pages.json")) as f:
    pages = json.load(f)

for page in pages:
    frag_path = os.path.join(BUILD, "fragments", page["fragment"])
    with open(frag_path) as f:
        body = f.read()
    write_page(page["out"], page["title"], page["description"], page["active"], body, page.get("extra_scripts", ""))

# ---------------------------------------------------------------
# Beaux Legacy Archive — data-driven class pages + profile pages
# ---------------------------------------------------------------
THEME_ACCENTS = {
    "classic": "var(--burgundy)",
    "creme": "var(--gold)",
    "regal": "var(--gold)",
    "bold": "var(--crest-crimson)",
    "phoenix": "var(--ember)",
    "renaissance": "var(--gold)",
}

with open(os.path.join(ROOT, "content", "classes.json")) as f:
    classes_data = json.load(f)["classes"]


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def media(photo, label, alt=""):
    if photo:
        safe_alt = esc(alt).replace('"', "&quot;")
        return f'<img src="{photo}" alt="{safe_alt}" style="width:100%;height:100%;object-fit:cover;" />'
    return f'<div class="ph-photo"><span>{esc(label)}</span></div>'



def render_profile_page(cls, p):
    if not p.get("bio"):
        # Lightweight profile: name + photo only. No bio/hometown/school/etc.
        # exist for this participant yet -- nothing here is invented.
        body = f"""
  <section class="section section--white" style="padding-top:150px;">
    <div class="container container--narrow">
      <div class="page-kicker" style="color:var(--gray-500);"><a href="/beaux/" style="color:var(--burgundy);">The Legacy</a> &rsaquo; <a href="/beaux/{cls['slug']}/" style="color:var(--burgundy);">Class of {cls['year']}</a> &rsaquo; {esc(p['name'])}</div>
      <div class="profile-hero" data-reveal>
        <div>{media(p.get("photo"), p['name'] + " — Portrait", p.get('alt', p['name']))}</div>
        <div>
          <span class="eyebrow">Class of {cls['year']} &middot; {esc(cls['theme'])}</span>
          <h1 class="display" style="font-size:2.2rem;">{esc(p['name'])}</h1>
          <p style="color:var(--gray-500);">This Beau's full biography — hometown, school, activities, and honors — is being compiled and will be added soon.</p>
          <a href="/beaux/{cls['slug']}/" class="btn-text">&larr; Back to Class of {cls['year']}</a>
          <div class="share-buttons" aria-label="Share this profile">
            <span class="share-label">Share</span>
            <button type="button" class="share-btn" data-share-native aria-label="Share this profile">
              <svg class="social-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.3M8.2 13.2l7.6 4.3"/></svg>
            </button>
            <a href="#" class="share-btn" data-share="facebook" target="_blank" rel="noopener noreferrer" aria-label="Share this profile on Facebook (opens in a new tab)">
              <svg class="social-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9.25"/><path d="M13.6 17.2v-5.6h1.9l.3-2.3h-2.2V7.9c0-.66.18-1.12 1.13-1.12h1.2V4.72c-.21-.03-.94-.09-1.78-.09-1.76 0-2.97 1.08-2.97 3.06v1.7H9.2v2.3h1.99v5.6"/></svg>
            </a>
            <button type="button" class="share-btn" data-share-copy aria-label="Copy link to this profile">
              <svg class="social-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 12.5a3 3 0 0 0 4.2.3l2.6-2.6a3 3 0 0 0-4.2-4.2l-1.4 1.3"/><path d="M15 11.5a3 3 0 0 0-4.2-.3l-2.6 2.6a3 3 0 0 0 4.2 4.2l1.4-1.3"/></svg>
            </button>
            <span class="share-copied-note" role="status"></span>
          </div>
        </div>
      </div>
    </div>
  </section>
"""
    else:
        body = f"""
  <section class="section section--white" style="padding-top:150px;">
    <div class="container container--narrow">
      <div class="page-kicker" style="color:var(--gray-500);"><a href="/beaux/" style="color:var(--burgundy);">The Legacy</a> &rsaquo; <a href="/beaux/{cls['slug']}/" style="color:var(--burgundy);">Class of {cls['year']}</a> &rsaquo; {esc(p['name'])}</div>
      <div class="profile-hero" data-reveal>
        <div>{media(p.get("photo"), p['name'] + " — Portrait", p['name'])}</div>
        <div>
          <span class="eyebrow">Class of {cls['year']} &middot; {esc(cls['theme'])}</span>
          <h1 class="display" style="font-size:2.2rem;">{esc(p['name'])}</h1>
          <p>{esc(p['bio'])}</p>
          <div class="profile-meta-list">
            <div><span>Hometown</span><strong>{esc(p['hometown'])}</strong></div>
            <div><span>High School</span><strong>{esc(p['high_school'])}</strong></div>
            <div><span>College</span><strong>{esc(p['college'])}</strong></div>
            <div><span>Major</span><strong>{esc(p['major'])}</strong></div>
            <div><span>Career Aspiration</span><strong>{esc(p['career'])}</strong></div>
            <div><span>Honors</span><strong>{esc(p['honors'])}</strong></div>
          </div>
          <div class="divider"></div>
          <h3 style="font-size:1.1rem;">Leadership Activities</h3>
          <p>{esc(p['activities'])}</p>
          <h3 style="font-size:1.1rem;">Community Service</h3>
          <p>{esc(p['community_service'])}</p>
          <a href="/beaux/{cls['slug']}/" class="btn-text">&larr; Back to Class of {cls['year']}</a>
          <div class="share-buttons" aria-label="Share this profile">
            <span class="share-label">Share</span>
            <button type="button" class="share-btn" data-share-native aria-label="Share this profile">
              <svg class="social-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.3M8.2 13.2l7.6 4.3"/></svg>
            </button>
            <a href="#" class="share-btn" data-share="facebook" target="_blank" rel="noopener noreferrer" aria-label="Share this profile on Facebook (opens in a new tab)">
              <svg class="social-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9.25"/><path d="M13.6 17.2v-5.6h1.9l.3-2.3h-2.2V7.9c0-.66.18-1.12 1.13-1.12h1.2V4.72c-.21-.03-.94-.09-1.78-.09-1.76 0-2.97 1.08-2.97 3.06v1.7H9.2v2.3h1.99v5.6"/></svg>
            </a>
            <button type="button" class="share-btn" data-share-copy aria-label="Copy link to this profile">
              <svg class="social-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 12.5a3 3 0 0 0 4.2.3l2.6-2.6a3 3 0 0 0-4.2-4.2l-1.4 1.3"/><path d="M15 11.5a3 3 0 0 0-4.2-.3l-2.6 2.6a3 3 0 0 0 4.2 4.2l1.4-1.3"/></svg>
            </button>
            <span class="share-copied-note" role="status"></span>
          </div>
        </div>
      </div>
    </div>
  </section>
"""
    write_page(
        f"beaux/{cls['slug']}/{p['slug']}/index.html",
        f"{p['name']} | Class of {cls['year']} | Beautillion Leadership Academy",
        f"{p['name']}, Class of {cls['year']} ({cls['theme']}) — Beautillion Leadership Academy.",
        "BEAUX",
        body,
    )


def render_class_page(cls):
    accent = THEME_ACCENTS.get(cls.get("style"), "var(--burgundy)")
    hero = f"""
  <section class="hero hero--page class-hero" style="--theme-accent:{accent}; min-height:80vh;">
    <div class="hero-media"><div class="ph-photo"><span>Class of {cls['year']} Panoramic Class Photograph — All Participants in Tuxedos</span></div></div>
    <div class="container">
      <div class="hero-content" data-reveal>
        <span class="eyebrow">Class of {cls['year']}</span>
        <h1 class="display">{esc(cls['theme'])}</h1>
        <p class="lede">{esc(cls.get('intro', cls['quote']))}</p>
      </div>
    </div>
  </section>
"""

    if not cls.get("full_page"):
        participants = cls.get("participants", [])

        if participants:
            # Photo directory only: real roster + photos exist, but the theme
            # essay / stats / honors / gallery content for this class does not
            # yet -- so those sections are simply omitted rather than invented.
            directory_html = "".join(
                f'''<a class="card participant-card" href="/beaux/{cls['slug']}/{p['slug']}/" data-name="{esc(p['name']).lower()}">
                <div class="card-media">{media(p.get("card_photo") or p.get("photo"), p['name'], p.get('alt', p['name']))}</div>
                <div class="card-body"><h3>{esc(p['name'])}</h3></div>
                <div class="pc-hover"><h4>{esc(p['name'])}</h4><p>View Full Profile &rarr;</p></div>
                </a>'''
                for p in participants
            )
            body = hero + f"""
  <section class="section section--white text-center">
    <div class="container container--narrow" data-reveal>
      <div class="gold-rule"></div>
      <span class="eyebrow" style="justify-content:center;">The Full Story Is Coming</span>
      <h2 class="display" style="font-size:1.6rem;">This Class's Theme Essay, Honors, and Gallery Are Being Compiled</h2>
      <p>In the meantime, meet the Beaux of the Class of {cls['year']}.</p>
    </div>
  </section>
  <section class="section section--champagne">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <span class="eyebrow">Participant Directory</span>
        <h2 class="display">Meet the Class of {cls['year']}</h2>
      </div>
      <div class="directory-search" data-reveal>
        <input type="search" id="directory-search" placeholder="Search by name..." aria-label="Search participants" />
      </div>
      <div class="grid grid-3" id="participant-directory" data-reveal>{directory_html}</div>
      <p id="directory-empty" style="display:none; text-align:center; color:var(--gray-500); margin-top:24px;">No participants match that search.</p>
    </div>
  </section>
  <section class="cta-band">
    <div class="container" data-reveal>
      <h2 class="display" style="font-size:1.8rem;">Explore the Full Legacy</h2>
      <div class="btn-row"><a href="/beaux/" class="btn btn-primary">Back to the Legacy Timeline</a></div>
    </div>
  </section>

  <script>
  (function() {{
    var input = document.getElementById('directory-search');
    var empty = document.getElementById('directory-empty');
    if (!input) return;
    input.addEventListener('input', function() {{
      var q = input.value.trim().toLowerCase();
      var cards = document.querySelectorAll('#participant-directory .participant-card');
      var visible = 0;
      cards.forEach(function(card) {{
        var match = (card.getAttribute('data-name') || '').indexOf(q) > -1;
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      }});
      empty.style.display = visible === 0 ? 'block' : 'none';
    }});
  }})();
  </script>
"""
            write_page(
                f"beaux/{cls['slug']}/index.html",
                f"Class of {cls['year']}: {cls['theme']} | Beautillion Leadership Academy",
                f"{cls['quote']}",
                "BEAUX",
                body,
            )
            for p in participants:
                render_profile_page(cls, p)
            return

        body = hero + """
  <section class="section section--white text-center">
    <div class="container container--narrow" data-reveal>
      <div class="gold-rule"></div>
      <span class="eyebrow" style="justify-content:center;">Coming Soon</span>
      <h2 class="display" style="font-size:1.6rem;">This Class Page Is Being Compiled</h2>
      <p>We're gathering the full story of this class — participant roster, honors, and photographs. In the meantime, explore the class page we've fully documented.</p>
      <a href="/beaux/2027/" class="btn-text">See a completed class page &rarr;</a>
    </div>
  </section>
  <section class="cta-band">
    <div class="container" data-reveal>
      <h2 class="display" style="font-size:1.8rem;">Explore the Full Legacy</h2>
      <div class="btn-row"><a href="/beaux/" class="btn btn-primary">Back to the Legacy Timeline</a></div>
    </div>
  </section>
"""
        write_page(
            f"beaux/{cls['slug']}/index.html",
            f"Class of {cls['year']}: {cls['theme']} | Beautillion Leadership Academy",
            f"{cls['quote']}",
            "BEAUX",
            body,
        )
        return

    # ---- Full flagship class page (2027) ----
    essay_paragraphs = "".join(f"<p>{esc(p)}</p>" for p in cls.get("theme_essay", []))
    stats_html = "".join(
        f'<div class="stat-card"><span class="num" style="font-size:1.8rem;">{esc(s["value"])}</span><span class="label">{esc(s["label"])}</span></div>'
        for s in cls.get("stats", [])
    )
    honors_html = "".join(
        f'''<div class="honor-card" data-reveal>{media(h.get("photo"), h["photo_label"], h["title"])}
        <div class="honor-title">{esc(h["title"])}</div>
        <div class="honor-name">{esc(h["recipient"])}</div>
        <p class="honor-desc">{esc(h["significance"])}</p></div>'''
        for h in cls.get("honors", [])
    )
    directory_html = "".join(
        f'''<a class="card participant-card" href="/beaux/{cls['slug']}/{p['slug']}/" data-name="{esc(p['name']).lower()}" data-school="{esc(p['high_school']).lower()}" data-college="{esc(p['college']).lower()}" data-hometown="{esc(p['hometown']).lower()}">
        <div class="card-media">{media(p.get("photo"), p['name'] + " Headshot", p['name'])}</div>
        <div class="card-body"><h3>{esc(p['name'])}</h3><p class="school">{esc(p['hometown'])}</p></div>
        <div class="pc-hover"><h4>{esc(p['name'])}</h4><p>{esc(p['high_school'])}</p><p>{esc(p['college'])} &middot; {esc(p['major'])}</p><p>{esc(p['career'])}</p></div>
        </a>'''
        for p in cls.get("participants", [])
    )
    gallery_html = "".join(
        f'<div class="m-item" data-lightbox data-caption="{esc(g["caption"])}">{media(g.get("image"), g["label"], g["caption"])}</div>'
        for g in cls.get("gallery", [])
    )

    body = hero + f"""
  <section class="section section--white">
    <div class="container theme-essay" data-reveal>
      <div class="gold-rule"></div>
      <span class="eyebrow" style="justify-content:center;">The Meaning Behind the Theme</span>
      <h2 class="display" style="font-size:2rem;">{esc(cls.get('theme_essay_title', cls['theme']))}</h2>
      {essay_paragraphs}
    </div>
  </section>

  <section class="section section--champagne">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <span class="eyebrow">By the Numbers</span>
        <h2 class="display" style="font-size:1.8rem;">Class of {cls['year']} Snapshot</h2>
      </div>
      <div class="grid grid-4" data-reveal>{stats_html}</div>
      <p style="text-align:center; color:var(--gray-500); font-size:0.82rem; margin-top:20px;">{esc(cls.get('stats_note', ''))}</p>
    </div>
  </section>

  <section class="section section--white">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <span class="eyebrow">Class Honors</span>
        <h2 class="display">Celebrating Excellence</h2>
      </div>
      <div class="honors-grid">{honors_html}</div>
    </div>
  </section>

  <section class="section section--champagne">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <span class="eyebrow">Participant Directory</span>
        <h2 class="display">Meet the Class of {cls['year']}</h2>
      </div>
      <div class="directory-search" data-reveal>
        <input type="search" id="directory-search" placeholder="Search by name, high school, hometown, or college..." aria-label="Search participants" />
      </div>
      <div class="grid grid-3" id="participant-directory" data-reveal>{directory_html}</div>
      <p id="directory-empty" style="display:none; text-align:center; color:var(--gray-500); margin-top:24px;">No participants match that search.</p>
    </div>
  </section>

  <section class="section section--white">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <span class="eyebrow">Photo Gallery</span>
        <h2 class="display">Class of {cls['year']}, in Pictures</h2>
      </div>
      <div class="masonry-gallery" data-reveal>{gallery_html}</div>
    </div>
  </section>

  <div class="lightbox">
    <div class="lightbox-inner">
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <div class="ph-photo"><span>Photo</span></div>
      <p class="lightbox-caption"></p>
    </div>
  </div>

  <script>
  (function() {{
    var input = document.getElementById('directory-search');
    var empty = document.getElementById('directory-empty');
    if (!input) return;
    input.addEventListener('input', function() {{
      var q = input.value.trim().toLowerCase();
      var cards = document.querySelectorAll('#participant-directory .participant-card');
      var visible = 0;
      cards.forEach(function(card) {{
        var haystack = (card.getAttribute('data-name') + ' ' + card.getAttribute('data-school') + ' ' + card.getAttribute('data-college') + ' ' + card.getAttribute('data-hometown'));
        var match = haystack.indexOf(q) > -1;
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      }});
      empty.style.display = visible === 0 ? 'block' : 'none';
    }});
  }})();
  </script>
"""
    write_page(
        f"beaux/{cls['slug']}/index.html",
        f"Class of {cls['year']}: {cls['theme']} | Beautillion Leadership Academy",
        f"{cls['quote']}",
        "BEAUX",
        body,
    )

    for p in cls.get("participants", []):
        render_profile_page(cls, p)


for cls in classes_data:
    render_class_page(cls)

def render_beaux_hub():
    cards_html = ""
    for cls in classes_data:
        cards_html += f"""
        <div class="legacy-card" data-reveal>
          <div class="lc-media"><div class="ph-photo"><span>Class of {cls['year']} — Class Portrait</span></div></div>
          <div class="lc-body">
            <span class="lc-year">{cls['year']}</span>
            <h3 class="lc-theme">{esc(cls['theme'])}</h3>
            <p class="lc-quote">&ldquo;{esc(cls['quote'])}&rdquo;</p>
            <a href="/beaux/{cls['slug']}/" class="btn-text lc-cta">Explore This Class <span class="arrow">&rarr;</span></a>
          </div>
        </div>"""

    body = f"""
  <section class="hero hero--page" style="min-height:88vh;">
    <div class="hero-media"><div class="ph-photo"><span>Panoramic Photograph of the Current Academy Class — All Participants in Tuxedos</span></div></div>
    <div class="container">
      <div class="hero-content" data-reveal>
        <span class="eyebrow">The Beaux</span>
        <h1 class="display">The Legacy</h1>
        <p class="lede">Every class leaves its mark. Since 2008, the Beautillion Leadership Academy has welcomed outstanding young men whose leadership, scholarship, service, and achievements continue to strengthen their communities and inspire future generations.</p>
        <a href="#timeline" class="btn btn-primary">Explore the Classes</a>
      </div>
    </div>
  </section>

  <section class="section section--white" id="timeline">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <span class="eyebrow">Our Legacy Timeline</span>
        <h2 class="display">One Academy, Nineteen Years, Countless Leaders</h2>
      </div>
      <div class="legacy-grid">{cards_html}
      </div>
    </div>
  </section>

  <section class="hero hero--page" style="min-height:64vh; align-items:center;">
    <div class="hero-media"><div class="ph-photo"><span>Alumni Standing Alongside Current Participants</span></div></div>
    <div class="container text-center">
      <div class="hero-content" data-reveal style="max-width:700px; margin:0 auto; text-align:center;">
        <span class="eyebrow" style="justify-content:center;">One Legacy. Many Stories.</span>
        <h2 class="display" style="color:var(--white);">The story of the Beautillion Leadership Academy is written one class at a time.</h2>
        <p class="lede" style="margin:0 auto 28px;">Every participant becomes part of a growing legacy of scholarship, leadership, service, and excellence. While each class carries its own identity and theme, they are united by a shared commitment to developing young men who will make a lasting impact on their families, professions, and communities.</p>
        <div class="hero-cta-row" style="justify-content:center;">
          <a href="/leadership-academy/" class="btn btn-primary">Explore the Academy</a>
          <a href="/apply/" class="btn btn-outline-light">Apply to the Next Class</a>
        </div>
      </div>
    </div>
  </section>
"""
    write_page(
        "beaux/index.html",
        "The Legacy | Beautillion Leadership Academy",
        "Every class leaves its mark. Explore the Beautillion Leadership Academy\'s legacy timeline since 2008.",
        "BEAUX",
        body,
    )


render_beaux_hub()


