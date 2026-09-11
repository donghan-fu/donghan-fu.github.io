/* Donghan Fu — homepage router + Scholar sync
   Single-file SPA. Only one <section.page> visible at a time,
   selected by URL hash: #/about → data-route="/about".
*/

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Footer year / build date ----------
  const now = new Date();
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = now.getFullYear();
  const buildEl = $("#build-date");
  if (buildEl) {
    buildEl.textContent =
      "Updated " +
      now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  }

  // ---------- Router ----------
  const pages = $$(".page");
  const navLinks = $$(".chapters-nav a");
  const nav = $(".chapters-nav");
  const menuBtn = $(".menu-btn");

  function currentRoute() {
    const raw = (location.hash || "#/").replace(/^#/, "");
    return raw === "" ? "/" : raw;
  }

  function showRoute(route) {
    let matched = null;
    pages.forEach((p) => {
      const r = p.getAttribute("data-route");
      const on = r === route;
      p.classList.toggle("active", on);
      if (on) matched = p;
    });
    if (!matched) {
      // Fallback to home
      const home = pages.find
        ? pages.find((p) => p.getAttribute("data-route") === "/")
        : $(".page[data-route='/']");
      if (home) home.classList.add("active");
    }

    // Update nav highlighting
    navLinks.forEach((a) => {
      const href = a.getAttribute("href") || "";
      a.classList.toggle("active", href === "#" + route);
    });

    // Update document title
    const chapterTitle = matched
      ? matched.querySelector(".chapter-title")?.textContent?.trim()
      : null;
    document.title = chapterTitle
      ? `${chapterTitle} · Donghan Fu`
      : "Donghan Fu · 付东晗";

    // Scroll to top of stage
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    // Close mobile menu if open
    if (nav && nav.classList.contains("open")) {
      nav.classList.remove("open");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    }
  }

  function onHashChange() {
    showRoute(currentRoute());
  }
  window.addEventListener("hashchange", onHashChange);

  // ---------- Mobile menu ----------
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
  }

  // ---------- Back to top ----------
  const toTop = $("#to-top");
  if (toTop) {
    window.addEventListener(
      "scroll",
      () => {
        toTop.classList.toggle("visible", window.scrollY > 600);
      },
      { passive: true }
    );
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ---------- Google Scholar sync ----------
  async function loadScholarStats() {
    try {
      const resp = await fetch("assets/data/scholar-stats.json", {
        cache: "no-cache",
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      renderScholarStats(data);
      renderPerPaperCitations(data.publications || []);
    } catch (err) {
      console.warn("Scholar stats unavailable:", err);
    }
  }

  function renderScholarStats(data) {
    const map = {
      citations: data.citedby,
      hindex: data.hindex,
      i10index: data.i10index,
    };
    $$("[data-stat]").forEach((el) => {
      const key = el.getAttribute("data-stat");
      if (map[key] != null && map[key] !== 0) el.textContent = map[key];
    });
    const upd = $("#scholar-updated");
    if (upd && data.updated) {
      const d = new Date(data.updated);
      if (!isNaN(d)) {
        upd.textContent =
          "· scholar sync " +
          d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
      }
    }
  }

  // Fuzzy title matcher — Scholar titles often differ from short display titles
  // (e.g. subtitles, different phrasing). Match by longest content-word overlap.
  function renderPerPaperCitations(pubs) {
    if (!Array.isArray(pubs) || pubs.length === 0) return;
    const STOP = new Set([
      "the","a","an","of","in","on","for","and","or","to","with","by",
      "from","at","is","are","how","what","this","that","its","their",
      "chinese","study","research","among","between","across","using",
      "toward","towards","paper","new","evidence","analysis","approach",
    ]);
    const tokens = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/['''""‑–—]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 3 && !STOP.has(t));

    const pubTokens = pubs.map((p) => ({ pub: p, tokens: new Set(tokens(p.title)) }));

    $$(".citation-badge").forEach((badge) => {
      const query = tokens(badge.getAttribute("data-cite-title"));
      if (query.length === 0) return;

      let best = null;
      let bestScore = 0;
      for (const { pub, tokens: pt } of pubTokens) {
        let shared = 0;
        for (const t of query) if (pt.has(t)) shared++;
        const score = shared / Math.max(query.length, 1);
        if (score > bestScore) {
          bestScore = score;
          best = pub;
        }
      }
      // Require at least ~40% keyword overlap for a confident match
      if (best && bestScore >= 0.4 && best.citedby != null) {
        badge.textContent = "Cited by " + best.citedby;
      }
    });
  }

  // ---------- Sub-navigator (per-container) ----------
  function initSubNav(root) {
    const tabs = Array.from(root.querySelectorAll(".sub-tab"));
    const slides = Array.from(root.querySelectorAll(".sub-slide"));
    const prev = root.querySelector(".slide-prev");
    const next = root.querySelector(".slide-next");
    const current = root.querySelector(".slide-current");
    let idx = 0;

    function show(nextIdx, dir) {
      if (nextIdx < 0 || nextIdx >= slides.length) return;
      if (nextIdx === idx) { updateUI(); return; }
      const dirClass = dir === "prev" ? "slide-in-left" : "slide-in-right";
      slides.forEach((s, i) => {
        const on = i === nextIdx;
        s.classList.remove("active", "slide-in-left", "slide-in-right");
        if (on) { s.hidden = false; s.classList.add("active", dirClass); }
        else    { s.hidden = true; }
      });
      idx = nextIdx;
      updateUI();

      // Scroll the tab strip near top of viewport
      const nav = root.querySelector(".sub-nav");
      if (nav) {
        const rect = nav.getBoundingClientRect();
        const target = window.scrollY + rect.top - 90;
        if (window.scrollY > target + 20) {
          window.scrollTo({ top: target, behavior: "smooth" });
        }
      }
    }

    function updateUI() {
      tabs.forEach((t, i) => {
        const on = i === idx;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", String(on));
      });
      if (prev) prev.disabled = idx === 0;
      if (next) next.disabled = idx === slides.length - 1;
      if (current) current.textContent = String(idx + 1).padStart(2, "0");
    }

    tabs.forEach((t, i) => t.addEventListener("click", () => {
      show(i, i > idx ? "next" : "prev");
    }));
    if (prev) prev.addEventListener("click", () => show(idx - 1, "prev"));
    if (next) next.addEventListener("click", () => show(idx + 1, "next"));

    function reset() {
      idx = 0;
      slides.forEach((s, i) => {
        s.hidden = i !== 0;
        s.classList.toggle("active", i === 0);
        s.classList.remove("slide-in-left", "slide-in-right");
      });
      updateUI();
    }

    updateUI();
    return { reset };
  }

  // Initialize every sub-navigator in the document, keyed by its parent route
  const subNavs = new Map();
  $$("[data-sub-nav]").forEach((root) => {
    const page = root.closest(".page");
    const route = page ? page.getAttribute("data-route") : null;
    const api = initSubNav(root);
    if (route) subNavs.set(route, api);
  });

  // When the user navigates to a route with a sub-nav, reset to the first slide
  window.addEventListener("hashchange", () => {
    const api = subNavs.get(currentRoute());
    if (api) api.reset();
  });

  // ---------- Boot ----------
  showRoute(currentRoute());
  const initialApi = subNavs.get(currentRoute());
  if (initialApi) initialApi.reset();
  loadScholarStats();
})();
