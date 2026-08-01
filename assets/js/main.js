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

  /* ---------- Current year in footer ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
