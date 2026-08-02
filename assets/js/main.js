/* =========================================================
   BEAUTILLION LEADERSHIP ACADEMY — SITE SCRIPT
   Vanilla JS. No build step, no dependencies.
   Handles: nav, scroll reveals, counters, content binding,
   gallery lightbox/filters, and the Apply form.
   ========================================================= */

(function () {
  "use strict";

  /* ---------- Header scroll state ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.querySelector(".mobile-nav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = toggle.classList.toggle("is-open");
      mobileNav.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.classList.remove("is-open");
        mobileNav.classList.remove("is-open");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 90 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var counterIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterIO.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) { counterIO.observe(el); });
  }
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var prefix = el.getAttribute("data-prefix") || "";
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(target * eased);
      el.textContent = prefix + value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Content loading / data-binding ----------
     Any element with [data-bind="path.to.field"] gets its
     textContent replaced by that field from a fetched JSON
     file. This is what lets the CMS-managed /content/*.json
     files update page copy without touching HTML.
  --------------------------------------------------------- */
  function getPath(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      if (acc === undefined || acc === null) return undefined;
      var m = key.match(/^(.+)\[(\d+)\]$/);
      if (m) return acc[m[1]] ? acc[m[1]][parseInt(m[2], 10)] : undefined;
      return acc[key];
    }, obj);
  }

  window.Beautillion = window.Beautillion || {};

  window.Beautillion.loadContent = function (jsonPath, onData) {
    fetch(jsonPath, { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
      .then(function (data) {
        document.querySelectorAll("[data-bind]").forEach(function (el) {
          var path = el.getAttribute("data-bind");
          var val = getPath(data, path);
          if (val === undefined || val === null) return;
          if (el.hasAttribute("data-bind-href")) el.setAttribute("href", val);
          else if (el.hasAttribute("data-bind-src")) el.setAttribute("src", val);
          else el.textContent = val;
        });
        if (typeof onData === "function") onData(data);
      })
      .catch(function () { /* fall back silently to hardcoded HTML content */ });
  };

  /* ---------- Generic list renderer ---------- */
  window.Beautillion.renderList = function (containerSelector, items, templateFn) {
    var container = document.querySelector(containerSelector);
    if (!container || !Array.isArray(items)) return;
    container.innerHTML = items.map(templateFn).join("");
  };

  window.Beautillion.phPhoto = function (label, light) {
    return '<div class="ph-photo' + (light ? " light" : "") + '"><span>' + label + "</span></div>";
  };

  window.Beautillion.mediaBlock = function (imgSrc, label, alt) {
    if (imgSrc) {
      return '<img src="' + imgSrc + '" alt="' + (alt || "").replace(/"/g, "&quot;") + '" style="width:100%;height:100%;object-fit:cover;" />';
    }
    return '<div class="ph-photo"><span>' + label + '</span></div>';
  };

  /* ---------- Gallery lightbox (if present on page) ---------- */
  var lightbox = document.querySelector(".lightbox");
  if (lightbox) {
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-lightbox]");
      if (trigger) {
        var caption = trigger.getAttribute("data-caption") || "";
        var media = lightbox.querySelector(".lightbox-inner .ph-photo span");
        var captionEl = lightbox.querySelector(".lightbox-caption");
        if (media) media.textContent = caption;
        if (captionEl) captionEl.textContent = caption;
        lightbox.classList.add("is-open");
      }
      if (e.target.closest(".lightbox-close") || e.target === lightbox) {
        lightbox.classList.remove("is-open");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") lightbox.classList.remove("is-open");
    });
  }

  /* ---------- Gallery filters (if present) ---------- */
  var filterButtons = document.querySelectorAll(".gallery-filters button");
  if (filterButtons.length) {
    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterButtons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var filter = btn.getAttribute("data-filter");
        document.querySelectorAll(".gallery-item").forEach(function (item) {
          var cats = (item.getAttribute("data-category") || "").split(",");
          item.style.display = filter === "all" || cats.indexOf(filter) > -1 ? "" : "none";
        });
      });
    });
  }

  /* ---------- Apply form ---------- */
  var applyForm = document.querySelector("#apply-form");
  if (applyForm) {
    applyForm.addEventListener("submit", function (e) {
      var action = applyForm.getAttribute("action") || "";
      var isConfigured = action.indexOf("formspree.io") > -1 && action.indexOf("YOUR_FORM_ID") === -1;
      if (!isConfigured) {
        e.preventDefault();
        var note = document.querySelector("#apply-form-note");
        if (note) {
          note.textContent = "Form endpoint not yet connected — see the README for the one-time Formspree setup step. Your entries are not being sent anywhere yet.";
          note.style.color = "#9c140e";
        }
        return;
      }
      // Progressive enhancement: let Formspree receive it, but show inline success.
      e.preventDefault();
      var data = new FormData(applyForm);
      fetch(action, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (res) {
          if (res.ok) {
            applyForm.innerHTML = '<div class="form-success"><h3>Application received</h3><p>Thank you for applying to the Beautillion Leadership Academy. Our committee will be in touch within two weeks regarding next steps.</p></div>';
          } else {
            throw new Error("submit-failed");
          }
        })
        .catch(function () {
          var note = document.querySelector("#apply-form-note");
          if (note) note.textContent = "Something went wrong submitting your application. Please email us directly so we don't miss you.";
        });
    });
  }

  /* ---------- Social media component ----------
     Site-wide Instagram/Facebook/TikTok links are stored in
     content/site.json so the committee can update them via the
     CMS without touching code. This binds any [data-social="platform"]
     element's href from that file, appends UTM tracking params
     scoped to where the link lives (data-utm-campaign), and fires
     a lightweight click event for analytics if a dataLayer exists.
     Curated posts (never a live/scraped feed) live in
     content/social-highlights.json and are rendered into the
     homepage "Follow the Journey" grid.
  --------------------------------------------------------- */
  var SOCIAL_ICONS = {
    instagram: '<svg class="social-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg class="social-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9.25"/><path d="M13.6 17.2v-5.6h1.9l.3-2.3h-2.2V7.9c0-.66.18-1.12 1.13-1.12h1.2V4.72c-.21-.03-.94-.09-1.78-.09-1.76 0-2.97 1.08-2.97 3.06v1.7H9.2v2.3h1.99v5.6"/></svg>',
    tiktok: '<svg class="social-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M13.2 4v10.6a3.1 3.1 0 1 1-2.3-3v-1.5"/><path d="M13.2 4c.35 2.15 1.95 3.75 4.05 4.05v2c-1.45-.05-2.85-.55-4.05-1.4"/></svg>'
  };
  var PLATFORM_NAMES = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

  function buildTrackedUrl(base, campaign) {
    try {
      var u = new URL(base);
      u.searchParams.set("utm_source", "website");
      u.searchParams.set("utm_medium", "social");
      u.searchParams.set("utm_campaign", campaign || "website");
      return u.toString();
    } catch (e) {
      return base;
    }
  }

  function loadSocialLinks() {
    var els = document.querySelectorAll("[data-social]");
    if (!els.length) return;
    fetch("/content/site.json", { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
      .then(function (data) {
        var social = (data && data.social) || {};
        els.forEach(function (el) {
          var platform = el.getAttribute("data-social");
          var base = social[platform];
          if (!base) return;
          var campaign = el.getAttribute("data-utm-campaign") || "website";
          el.setAttribute("href", buildTrackedUrl(base, campaign));
        });
      })
      .catch(function () { /* links stay as "#" if the file can't be reached */ });
  }
  loadSocialLinks();

  // Click tracking: pushes to window.dataLayer if present (e.g. once GTM/GA
  // is added later); otherwise this is a harmless no-op.
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-social]");
    if (!el) return;
    var platform = el.getAttribute("data-social");
    var location = el.getAttribute("data-utm-campaign") || "unknown";
    if (window.dataLayer && typeof window.dataLayer.push === "function") {
      window.dataLayer.push({ event: "social_click", social_platform: platform, social_location: location });
    }
  });

  /* ---------- Homepage: Follow the Journey curated grid ---------- */
  function loadSocialHighlights() {
    var grid = document.getElementById("home-social-highlights");
    if (!grid) return;
    fetch("/content/social-highlights.json", { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
      .then(function (data) {
        var items = (data && data.highlights) || [];
        if (!items.length) return;
        var featured = items.filter(function (i) { return i.featured; })[0] || items[0];
        var rest = items.filter(function (i) { return i !== featured; }).slice(0, 5);
        var ordered = [featured].concat(rest);
        grid.innerHTML = ordered.map(function (item, i) {
          var icon = SOCIAL_ICONS[item.platform] || "";
          var name = PLATFORM_NAMES[item.platform] || item.platform;
          var media = item.image
            ? '<img src="' + item.image + '" alt="' + (item.alt || "").replace(/"/g, "&quot;") + '" />'
            : window.Beautillion.phPhoto(item.alt || name + " post");
          var dateLabel = "";
          if (item.date) {
            var d = new Date(item.date + "T00:00:00");
            if (!isNaN(d.getTime())) dateLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
          }
          return '' +
            '<a class="sh-item' + (i === 0 ? " is-featured" : "") + '" href="' + (item.link || "#") + '" ' +
            'data-social="' + item.platform + '" data-utm-campaign="homepage_grid" target="_blank" rel="noopener noreferrer" ' +
            'aria-label="View this ' + name + ' post (opens in a new tab): ' + (item.caption || "").replace(/"/g, "&quot;") + '">' +
            '<div class="sh-media">' + media + '<span class="sh-badge">' + icon + '</span></div>' +
            '<div class="sh-body"><p class="sh-caption">' + (item.caption || "") + '</p><span class="sh-date">' + dateLabel + '</span></div>' +
            '</a>';
        }).join("");
        loadSocialLinks(); // re-run in case any injected [data-social] elements need UTM hrefs (grid items already have direct links, this is a no-op safeguard)
      })
      .catch(function () { /* section simply stays empty if the file can't be reached */ });
  }
  loadSocialHighlights();

  /* ---------- Mobile "Follow the Academy" card: dismiss once per session ---------- */
  (function () {
    var card = document.getElementById("mobile-social-card");
    if (!card) return;
    if (sessionStorage.getItem("beautillion-social-card-dismissed")) {
      card.parentNode.removeChild(card);
      return;
    }
    var dismissBtn = document.getElementById("msc-dismiss");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", function () {
        card.classList.add("is-dismissed");
        sessionStorage.setItem("beautillion-social-card-dismissed", "1");
        setTimeout(function () {
          if (card.parentNode) card.parentNode.removeChild(card);
        }, 300);
      });
    }
  })();

  /* ---------- Content-page share buttons ---------- */
  document.querySelectorAll(".share-buttons").forEach(function (bar) {
    var pageUrl = window.location.href;
    var pageTitle = document.title;
    var nativeBtn = bar.querySelector("[data-share-native]");
    if (nativeBtn) {
      if (navigator.share) {
        nativeBtn.addEventListener("click", function () {
          navigator.share({ title: pageTitle, url: pageUrl }).catch(function () {});
        });
      } else {
        nativeBtn.style.display = "none";
      }
    }
    var fbBtn = bar.querySelector('[data-share="facebook"]');
    if (fbBtn) {
      fbBtn.setAttribute("href", "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(pageUrl));
    }
    var copyBtn = bar.querySelector("[data-share-copy]");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var note = bar.querySelector(".share-copied-note");
        function announce() {
          if (note) {
            note.textContent = "Link copied";
            setTimeout(function () { note.textContent = ""; }, 2500);
          }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(pageUrl).then(announce).catch(function () {});
        }
      });
    }
  });

  /* ---------- Current year in footer ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
