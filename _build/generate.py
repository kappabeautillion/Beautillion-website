import json, os, re

ROOT = "/tmp/beautillion"
BUILD = os.path.join(ROOT, "_build")

with open(os.path.join(BUILD, "header.html")) as f:
    HEADER_TPL = f.read()
with open(os.path.join(BUILD, "footer.html")) as f:
    FOOTER = f.read()

ACTIVE_KEYS = ["HOME", "ABOUT", "PROGRAM", "BEAUX", "ALUMNI", "SPONSORS", "NEWS", "GALLERY"]

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

with open(os.path.join(BUILD, "pages.json")) as f:
    pages = json.load(f)

for page in pages:
    frag_path = os.path.join(BUILD, "fragments", page["fragment"])
    with open(frag_path) as f:
        body = f.read()
    html = PAGE_TEMPLATE.format(
        title=page["title"],
        description=page["description"],
        header=render_header(page["active"]),
        body=body,
        footer=FOOTER,
        extra_scripts=page.get("extra_scripts", ""),
    )
    out_path = os.path.join(ROOT, page["out"])
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        f.write(html)
    print("wrote", out_path)
