(function () {
  "use strict";

  var ARTWORKS_URL = "data/artworks.json";
  var IMAGE_BASE   = "images/artworks/yoga/";

  var currentSeries = [];
  var seriesIndex   = -1;
  var imageIndex    = 0;
  var currentLang   = "en";
  var scrollObserver = null;
  var monthKeys     = [];

  // ---- Filter state ----
  var filterState = { month: null, medium: null, content: null };

  // ---- i18n ----
  var I18N = {
    en: {
      title: "Yoga's Art Gallery",
      subtitle: "Every piece tells a story",
      rights: "All rights reserved.",
      copyright_notice: "All artworks on this site are original creations and protected by copyright law. Unauthorized reproduction, distribution, or use is strictly prohibited.",
      made_with: "Made with",
      empty: "No artworks yet — stay tuned!",
      all: "All",
      clear_all: "Clear all",
      chalkboard: "chalkboard", "oil painting": "oil painting", collage: "collage",
      "mixed media": "mixed media", craft: "craft", "3D sculpture": "3D sculpture",
      drawing: "drawing", clay: "clay",
      animal: "animal", person: "person", vehicle: "vehicle", object: "object",
      house: "house", abstract: "abstract", nature: "nature", castle: "castle", food: "food"
    },
    zh: {
      title: "Yoga 的美术馆",
      subtitle: "每一幅都是一个故事",
      rights: "版权所有。",
      copyright_notice: "本网站所有作品均为原创，受版权法保护。未经授权，禁止复制、传播或使用。",
      made_with: "用心制作",
      empty: "还没有作品——敬请期待！",
      all: "全部",
      clear_all: "清除全部",
      chalkboard: "黑板画", "oil painting": "油画", collage: "拼贴",
      "mixed media": "混合媒材", craft: "手工", "3D sculpture": "3D雕塑",
      drawing: "绘画", clay: "黏土",
      animal: "动物", person: "人物", vehicle: "交通工具", object: "物品",
      house: "房子", abstract: "抽象", nature: "自然", castle: "城堡", food: "食物"
    }
  };

  var MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var MONTHS_ZH = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

  function t(key) { return I18N[currentLang][key] || key; }
  function mn() { return currentLang === "zh" ? MONTHS_ZH : MONTHS_EN; }

  var TAG_COLORS = {
    "chalkboard": "#4a5568", "oil painting": "#c53030", "collage": "#2b6cb0",
    "mixed media": "#c05621", "craft": "#2f855a", "3D sculpture": "#6b46c1",
    "drawing": "#4c51bf", "clay": "#975a16"
  };

  // ---- DOM refs ----
  var gallery         = document.getElementById("gallery");
  var filterBar       = document.getElementById("filter-bar");
  var timelineNav     = document.getElementById("timeline-nav");
  var mediumFilter    = document.getElementById("medium-filter");
  var contentCloud    = document.getElementById("content-cloud");
  var activeFilters   = document.getElementById("active-filters");
  var lightbox        = document.getElementById("lightbox");
  var lightboxImg     = document.getElementById("lightbox-img");
  var lightboxCaption = document.getElementById("lightbox-caption");
  var lightboxCounter = document.getElementById("lightbox-counter");
  var btnPrev         = lightbox.querySelector(".lightbox-prev");
  var btnNext         = lightbox.querySelector(".lightbox-next");
  var langToggle      = document.getElementById("lang-toggle");
  var themeToggle     = document.getElementById("theme-toggle");

  // ---- Helpers ----
  function getFile(img) { return typeof img === "string" ? img : img.file; }
  function imgSrc(img) { return IMAGE_BASE + getFile(img); }
  function getCaption(img) {
    if (typeof img === "string") return "";
    if (currentLang === "zh" && img.caption_zh) return img.caption_zh;
    return img.caption || "";
  }
  function getTitle(s) { return (currentLang === "zh" && s.title_zh) ? s.title_zh : s.title; }
  function getDescription(s) { return (currentLang === "zh" && s.description_zh) ? s.description_zh : (s.description || ""); }

  function formatDate(dateStr) {
    var M = mn(), parts = dateStr.split("-");
    var y = parts[0], m = parts[1] ? parseInt(parts[1], 10) : null, d = parts[2] ? parseInt(parts[2], 10) : null;
    if (currentLang === "zh") {
      if (m && d) return m + "月" + d + "日";
      if (m) return m + "月";
      return y + "年";
    }
    if (m && d) return M[m - 1] + " " + d;
    if (m) return M[m - 1];
    return y;
  }

  function monthKey(dateStr) {
    var parts = dateStr.split("-");
    if (parts.length >= 2) return parts[0] + "-" + parts[1].padStart(2, "0");
    return parts[0] + "-01";
  }

  function parseMonthKey(key) {
    var parts = key.split("-");
    return { month: mn()[parseInt(parts[1], 10) - 1], year: parts[0] };
  }

  function monthLabel(key) {
    var p = parseMonthKey(key);
    return p.month + " " + p.year;
  }

  function tagClass(tag) { return "tag-" + tag.toLowerCase().replace(/\s+/g, "-"); }

  // ---- Lazy loading ----
  var lazyObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var img = entry.target;
        if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute("data-src"); }
        lazyObserver.unobserve(img);
      }
    });
  }, { rootMargin: "200px 0px" });

  function createLazyImg(src, alt) {
    var img = document.createElement("img");
    img.alt = alt; img.dataset.src = src;
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    lazyObserver.observe(img);
    return img;
  }

  // ---- Theme ----
  function initTheme() {
    var saved = localStorage.getItem("gallery-theme");
    if (saved === "dark") { document.body.classList.add("dark"); themeToggle.textContent = "☀️"; }
    else if (saved === "light") { themeToggle.textContent = "🌙"; }
    else {
      var h = new Date().getHours();
      if (h >= 18 || h < 6) { document.body.classList.add("dark"); themeToggle.textContent = "☀️"; }
      else { themeToggle.textContent = "🌙"; }
    }
    themeToggle.addEventListener("click", function () {
      var isDark = document.body.classList.toggle("dark");
      themeToggle.textContent = isDark ? "☀️" : "🌙";
      localStorage.setItem("gallery-theme", isDark ? "dark" : "light");
    });
  }

  // ---- Language ----
  function initLang() {
    var saved = localStorage.getItem("gallery-lang");
    if (saved === "zh") { currentLang = "zh"; langToggle.textContent = "EN"; langToggle.title = "Switch to English"; }
    else { currentLang = "en"; langToggle.textContent = "中"; langToggle.title = "切换中文"; }
    langToggle.addEventListener("click", function () {
      currentLang = currentLang === "en" ? "zh" : "en";
      localStorage.setItem("gallery-lang", currentLang);
      langToggle.textContent = currentLang === "en" ? "中" : "EN";
      langToggle.title = currentLang === "en" ? "切换中文" : "Switch to English";
      updateI18nStrings();
      renderGallery();
      if (!lightbox.hidden) updateLightbox();
    });
  }

  function updateI18nStrings() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
  }

  // ---- Init ----
  async function init() {
    initTheme();
    initLang();
    try {
      var res = await fetch(ARTWORKS_URL);
      currentSeries = await res.json();
    } catch (err) {
      gallery.innerHTML = '<p class="empty-state">' + t("empty") + '</p>';
      return;
    }
    currentSeries.sort(function (a, b) { return b.date.localeCompare(a.date); });
    updateI18nStrings();
    renderGallery();
    bindLightbox();
    bindProtection();
  }

  // ==== RENDER GALLERY ====
  function renderGallery() {
    gallery.innerHTML = "";
    if (currentSeries.length === 0) {
      gallery.innerHTML = '<p class="empty-state">' + t("empty") + '</p>';
      return;
    }

    var groups = new Map();
    currentSeries.forEach(function (series, idx) {
      var key = monthKey(series.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ series: series, idx: idx });
    });

    monthKeys = Array.from(groups.keys());
    var fragment = document.createDocumentFragment();

    groups.forEach(function (items, key) {
      var parsed = parseMonthKey(key);
      var group = document.createElement("section");
      group.className = "timeline-group";
      group.id = "month-" + key;

      var label = document.createElement("div");
      label.className = "timeline-label";
      label.innerHTML = '<div class="timeline-month">' + parsed.month + '</div><div class="timeline-year">' + parsed.year + '</div>';

      var cardsWrap = document.createElement("div");
      cardsWrap.className = "timeline-cards";

      items.forEach(function (item) {
        var series = item.series, idx = item.idx;
        var card = document.createElement("div");
        card.className = "card";
        card.dataset.series = idx;
        card.dataset.month = key;
        if (series.tags && series.tags.length) card.dataset.medium = series.tags.join(",");
        if (series.content && series.content.length) card.dataset.content = series.content.join(",");

        var images = series.images;
        if (images.length === 1) {
          var img = createLazyImg(imgSrc(images[0]), getTitle(series));
          img.dataset.imgIdx = "0"; card.appendChild(img);
        } else {
          var grid = document.createElement("div");
          grid.className = "card-grid";
          var count = Math.min(images.length, 4);
          grid.classList.add("grid-" + count);
          for (var i = 0; i < count; i++) {
            var img = createLazyImg(imgSrc(images[i]), getTitle(series) + " " + (i + 1));
            img.dataset.imgIdx = String(i); grid.appendChild(img);
          }
          card.appendChild(grid);
        }

        var info = document.createElement("div");
        info.className = "card-info";
        var title = document.createElement("div");
        title.className = "card-title";
        title.textContent = getTitle(series);
        var meta = document.createElement("div");
        meta.className = "card-meta";
        var dateSpan = document.createElement("span");
        dateSpan.className = "card-date";
        dateSpan.textContent = formatDate(series.date);
        meta.appendChild(dateSpan);
        var desc = getDescription(series);
        if (desc) { var ds = document.createElement("span"); ds.className = "card-desc"; ds.textContent = desc; meta.appendChild(ds); }

        info.appendChild(title);

        if (series.tags && series.tags.length) {
          var tw = document.createElement("div"); tw.className = "card-tags";
          series.tags.forEach(function (tg) {
            var sp = document.createElement("span"); sp.className = "tag " + tagClass(tg); sp.textContent = t(tg); tw.appendChild(sp);
          });
          info.appendChild(tw);
        }

        info.appendChild(meta);
        card.appendChild(info);
        cardsWrap.appendChild(card);
      });

      group.appendChild(label);
      group.appendChild(cardsWrap);
      fragment.appendChild(group);
    });

    gallery.appendChild(fragment);
    buildTimeline();
    buildMediumFilter();
    buildContentCloud();
    buildActiveChips();
    applyFilters();
    setupScrollHighlight();
  }

  // ==== TIMELINE ====
  function buildTimeline() {
    var track = timelineNav.querySelector(".timeline-track");
    track.innerHTML = "";

    // "All" node
    var allNode = document.createElement("div");
    allNode.className = "tl-node tl-node-all" + (filterState.month === null ? " active" : "");
    allNode.innerHTML = '<div class="tl-dot"></div><div class="tl-label">' + t("all") + '</div>';
    allNode.addEventListener("click", function () { setFilter("month", null); });
    track.appendChild(allNode);

    // Group months by year for compact display
    var lastYear = null;
    monthKeys.forEach(function (key, i) {
      var p = parseMonthKey(key);

      // Year divider
      if (p.year !== lastYear) {
        if (i > 0) {
          var spacer = document.createElement("div");
          spacer.className = "tl-year-gap";
          track.appendChild(spacer);
        }
        var yearLabel = document.createElement("div");
        yearLabel.className = "tl-year-label";
        yearLabel.textContent = p.year;
        track.appendChild(yearLabel);
        lastYear = p.year;
      }

      // line segment
      var line = document.createElement("div");
      line.className = "tl-line";
      track.appendChild(line);

      // month node (show only short month name, no year)
      var node = document.createElement("div");
      node.className = "tl-node" + (filterState.month === key ? " active" : "");
      node.dataset.month = key;
      node.innerHTML = '<div class="tl-dot"></div><div class="tl-label">' + p.month + '</div>';
      node.addEventListener("click", function () {
        setFilter("month", filterState.month === key ? null : key);
      });
      track.appendChild(node);
    });

    enableDragScroll(timelineNav);
  }

  function enableDragScroll(el) {
    var isDown = false, startX, scrollLeft;
    el.addEventListener("mousedown", function (e) {
      if (e.target.closest(".tl-node")) return; // let clicks through
      isDown = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft;
      el.style.cursor = "grabbing";
    });
    el.addEventListener("mouseleave", function () { isDown = false; el.style.cursor = "grab"; });
    el.addEventListener("mouseup", function () { isDown = false; el.style.cursor = "grab"; });
    el.addEventListener("mousemove", function (e) {
      if (!isDown) return; e.preventDefault();
      el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX);
    });
  }

  // ==== MEDIUM FILTER ====
  function buildMediumFilter() {
    mediumFilter.innerHTML = "";
    var counts = {};
    currentSeries.forEach(function (s) {
      if (s.tags) s.tags.forEach(function (tg) { counts[tg] = (counts[tg] || 0) + 1; });
    });
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    keys.forEach(function (tg) {
      var btn = document.createElement("button");
      btn.className = "mf-btn" + (filterState.medium === tg ? " active" : "");
      btn.style.background = TAG_COLORS[tg] || "#7c5cbf";
      btn.dataset.medium = tg;
      var lbl = document.createElement("span"); lbl.textContent = t(tg);
      var cnt = document.createElement("span"); cnt.className = "mf-count"; cnt.textContent = counts[tg];
      btn.appendChild(lbl); btn.appendChild(cnt);
      btn.addEventListener("click", function () {
        setFilter("medium", filterState.medium === tg ? null : tg);
      });
      mediumFilter.appendChild(btn);
    });
  }

  // ==== CONTENT WORD CLOUD ====
  function buildContentCloud() {
    contentCloud.innerHTML = "";
    var counts = {};
    currentSeries.forEach(function (s) {
      if (s.content) s.content.forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
    });
    var keys = Object.keys(counts);
    if (!keys.length) return;
    // Shuffle for cloud feel then sort by count desc for visual weight
    keys.sort(function (a, b) { return counts[b] - counts[a]; });
    var maxC = Math.max.apply(null, keys.map(function (k) { return counts[k]; }));
    var minC = Math.min.apply(null, keys.map(function (k) { return counts[k]; }));
    var range = maxC - minC || 1;

    keys.forEach(function (c) {
      var word = document.createElement("button");
      word.className = "cc-word" + (filterState.content === c ? " active" : "");
      word.textContent = t(c);
      word.dataset.content = c;
      // Font size: 0.72rem to 1.05rem (subtle variation)
      var size = 0.72 + 0.33 * ((counts[c] - minC) / range);
      word.style.fontSize = size.toFixed(2) + "rem";
      word.addEventListener("click", function () {
        setFilter("content", filterState.content === c ? null : c);
      });
      contentCloud.appendChild(word);
    });
  }

  // ==== ACTIVE FILTER CHIPS ====
  function buildActiveChips() {
    activeFilters.innerHTML = "";
    var hasAny = filterState.month || filterState.medium || filterState.content;
    activeFilters.classList.toggle("has-filters", !!hasAny);
    if (!hasAny) return;

    if (filterState.month) {
      var chip = makeChip(monthLabel(filterState.month), function () { setFilter("month", null); });
      activeFilters.appendChild(chip);
    }
    if (filterState.medium) {
      var chip = makeChip(t(filterState.medium), function () { setFilter("medium", null); });
      activeFilters.appendChild(chip);
    }
    if (filterState.content) {
      var chip = makeChip(t(filterState.content), function () { setFilter("content", null); });
      activeFilters.appendChild(chip);
    }

    var clear = document.createElement("button");
    clear.className = "af-clear";
    clear.textContent = t("clear_all");
    clear.addEventListener("click", function () { clearAllFilters(); });
    activeFilters.appendChild(clear);
  }

  function makeChip(label, onClick) {
    var chip = document.createElement("button");
    chip.className = "af-chip";
    chip.innerHTML = label + ' <span class="af-x">&times;</span>';
    chip.addEventListener("click", onClick);
    return chip;
  }

  // ==== UNIFIED FILTER ENGINE ====
  function setFilter(dim, value) {
    filterState[dim] = value;
    applyFilters();
    updateFilterUI();
    buildActiveChips();
  }

  function clearAllFilters() {
    filterState.month = null;
    filterState.medium = null;
    filterState.content = null;
    applyFilters();
    updateFilterUI();
    buildActiveChips();
  }

  function applyFilters() {
    var cards = gallery.querySelectorAll(".card");
    cards.forEach(function (card) {
      var show = true;
      if (filterState.month && card.dataset.month !== filterState.month) show = false;
      if (show && filterState.medium) {
        var mediums = (card.dataset.medium || "").split(",");
        if (mediums.indexOf(filterState.medium) === -1) show = false;
      }
      if (show && filterState.content) {
        var contents = (card.dataset.content || "").split(",");
        if (contents.indexOf(filterState.content) === -1) show = false;
      }
      card.classList.toggle("filter-hidden", !show);
    });

    // Hide groups with no visible cards
    var groups = gallery.querySelectorAll(".timeline-group");
    groups.forEach(function (group) {
      var visible = group.querySelectorAll(".card:not(.filter-hidden)");
      group.classList.toggle("filter-hidden", visible.length === 0);
    });
  }

  function updateFilterUI() {
    // Timeline nodes
    timelineNav.querySelectorAll(".tl-node").forEach(function (node) {
      if (node.classList.contains("tl-node-all")) {
        node.classList.toggle("active", filterState.month === null);
      } else {
        node.classList.toggle("active", node.dataset.month === filterState.month);
      }
    });
    // Scroll active timeline node into view
    var activeNode = timelineNav.querySelector(".tl-node.active");
    if (activeNode) activeNode.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

    // Medium buttons
    mediumFilter.querySelectorAll(".mf-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.medium === filterState.medium);
    });

    // Content cloud
    contentCloud.querySelectorAll(".cc-word").forEach(function (w) {
      w.classList.toggle("active", w.dataset.content === filterState.content);
    });
  }

  // ==== SCROLL HIGHLIGHT ====
  function setupScrollHighlight() {
    if (scrollObserver) scrollObserver.disconnect();
    if (filterState.month) return; // Don't highlight when month filter is active

    scrollObserver = new IntersectionObserver(function (entries) {
      if (filterState.month) return; // Skip if month filter active
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var key = entry.target.id.replace("month-", "");
          timelineNav.querySelectorAll(".tl-node").forEach(function (node) {
            if (node.classList.contains("tl-node-all")) return;
            node.classList.toggle("active", node.dataset.month === key);
          });
          // Don't mark "All" as active during scroll — just highlight the current month
          timelineNav.querySelector(".tl-node-all").classList.remove("active");
          var an = timelineNav.querySelector(".tl-node.active");
          if (an) an.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      });
    }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });

    monthKeys.forEach(function (key) {
      var el = document.getElementById("month-" + key);
      if (el) scrollObserver.observe(el);
    });
  }

  // ==== LIGHTBOX ====
  function openLightbox(sIdx, imgIdx) {
    seriesIndex = sIdx; imageIndex = imgIdx || 0;
    updateLightbox();
    lightbox.hidden = false; void lightbox.offsetHeight;
    lightbox.classList.add("is-visible");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("is-visible");
    document.body.style.overflow = "";
    setTimeout(function () { lightbox.hidden = true; }, 300);
  }

  function updateLightbox() {
    var s = currentSeries[seriesIndex], imgs = s.images, cur = imgs[imageIndex];
    lightboxImg.src = imgSrc(cur); lightboxImg.alt = getTitle(s);
    lightboxCaption.textContent = getCaption(cur) || getDescription(s);
    if (imgs.length > 1) { lightboxCounter.textContent = (imageIndex + 1) + " / " + imgs.length; lightboxCounter.style.display = ""; }
    else { lightboxCounter.textContent = ""; lightboxCounter.style.display = "none"; }
    btnPrev.classList.toggle("is-hidden", imgs.length <= 1);
    btnNext.classList.toggle("is-hidden", imgs.length <= 1);
  }

  function navigate(dir) {
    var imgs = currentSeries[seriesIndex].images;
    imageIndex = (imageIndex + dir + imgs.length) % imgs.length;
    updateLightbox();
  }

  function bindLightbox() {
    gallery.addEventListener("click", function (e) {
      var card = e.target.closest(".card"); if (!card) return;
      var sIdx = Number(card.dataset.series);
      var ci = e.target.closest("img[data-img-idx]");
      openLightbox(sIdx, ci ? Number(ci.dataset.imgIdx) : 0);
    });
    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
    btnPrev.addEventListener("click", function (e) { e.stopPropagation(); navigate(-1); });
    btnNext.addEventListener("click", function (e) { e.stopPropagation(); navigate(1); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    });
    var tx = 0, ty = 0, tt = 0;
    lightbox.addEventListener("touchstart", function (e) { tx = e.changedTouches[0].screenX; ty = e.changedTouches[0].screenY; tt = Date.now(); }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].screenX - tx, dy = e.changedTouches[0].screenY - ty;
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 3 && Date.now() - tt < 500) { dx < 0 ? navigate(1) : navigate(-1); }
    }, { passive: true });
  }

  // ---- Image protection ----
  function bindProtection() {
    document.addEventListener("contextmenu", function (e) {
      if (e.target.tagName === "IMG" || e.target.closest(".card") || e.target.closest(".lightbox")) e.preventDefault();
    });
    document.addEventListener("dragstart", function (e) { if (e.target.tagName === "IMG") e.preventDefault(); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
