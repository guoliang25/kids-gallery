(function () {
  "use strict";

  const ARTWORKS_URL = "data/artworks.json";
  const IMAGE_BASE   = "images/artworks/yoga/";

  let currentSeries = [];
  let seriesIndex   = -1;
  let imageIndex    = 0;

  // ---- DOM refs ----
  const gallery         = document.getElementById("gallery");
  const lightbox        = document.getElementById("lightbox");
  const lightboxImg     = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const btnPrev         = lightbox.querySelector(".lightbox-prev");
  const btnNext         = lightbox.querySelector(".lightbox-next");

  // ---- Helpers ----
  function getFile(img)    { return typeof img === "string" ? img : img.file; }
  function getCaption(img) { return typeof img === "string" ? ""  : (img.caption || ""); }
  function imgSrc(img)     { return IMAGE_BASE + getFile(img); }

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function formatDate(dateStr) {
    const parts = dateStr.split("-");
    const y = parts[0];
    const m = parts[1] ? parseInt(parts[1], 10) : null;
    const d = parts[2] ? parseInt(parts[2], 10) : null;
    if (m && d) return MONTHS[m - 1] + " " + d;
    if (m)      return MONTHS[m - 1];
    return y;
  }

  function monthKey(dateStr) {
    const parts = dateStr.split("-");
    if (parts.length >= 2) return parts[0] + "-" + parts[1].padStart(2, "0");
    return parts[0] + "-01";
  }

  function parseMonthKey(key) {
    const [y, m] = key.split("-");
    return { month: MONTHS[parseInt(m, 10) - 1], year: y };
  }

  // ---- Lazy loading ----
  const lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
        }
        lazyObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: "200px 0px"   // start loading 200px before visible
  });

  function createLazyImg(src, alt) {
    const img = document.createElement("img");
    img.alt = alt;
    img.dataset.src = src;
    // tiny transparent gif as placeholder
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    lazyObserver.observe(img);
    return img;
  }

  // ---- Init ----
  async function init() {
    try {
      const res = await fetch(ARTWORKS_URL);
      currentSeries = await res.json();
    } catch (err) {
      gallery.innerHTML = '<p class="empty-state">No artworks yet — stay tuned!</p>';
      return;
    }

    currentSeries.sort((a, b) => b.date.localeCompare(a.date));
    renderGallery();
    bindLightbox();
    bindProtection();
  }

  // ---- Render ----
  function renderGallery() {
    gallery.innerHTML = "";

    if (currentSeries.length === 0) {
      gallery.innerHTML = '<p class="empty-state">No artworks yet — stay tuned!</p>';
      return;
    }

    // Group by month
    const groups = new Map();
    currentSeries.forEach((series, idx) => {
      const key = monthKey(series.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ series, idx });
    });

    const fragment = document.createDocumentFragment();

    groups.forEach((items, key) => {
      const { month, year } = parseMonthKey(key);

      const group = document.createElement("section");
      group.className = "timeline-group";

      const label = document.createElement("div");
      label.className = "timeline-label";
      label.innerHTML =
        '<div class="timeline-month">' + month + '</div>' +
        '<div class="timeline-year">' + year + '</div>';

      const cardsWrap = document.createElement("div");
      cardsWrap.className = "timeline-cards";

      items.forEach(({ series, idx }) => {
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.series = idx;

        const images = series.images;

        if (images.length === 1) {
          const img = createLazyImg(imgSrc(images[0]), series.title);
          img.dataset.imgIdx = "0";
          card.appendChild(img);
        } else {
          const grid = document.createElement("div");
          grid.className = "card-grid";
          const count = Math.min(images.length, 4);
          grid.classList.add("grid-" + count);

          for (let i = 0; i < count; i++) {
            const img = createLazyImg(imgSrc(images[i]), series.title + " " + (i + 1));
            img.dataset.imgIdx = String(i);
            grid.appendChild(img);
          }

          card.appendChild(grid);
        }

        const info = document.createElement("div");
        info.className = "card-info";

        const title = document.createElement("div");
        title.className = "card-title";
        title.textContent = series.title;

        const meta = document.createElement("div");
        meta.className = "card-meta";

        const dateSpan = document.createElement("span");
        dateSpan.className = "card-date";
        dateSpan.textContent = formatDate(series.date);

        meta.appendChild(dateSpan);

        if (series.description) {
          const descSpan = document.createElement("span");
          descSpan.className = "card-desc";
          descSpan.textContent = series.description;
          meta.appendChild(descSpan);
        }

        info.appendChild(title);
        info.appendChild(meta);
        card.appendChild(info);
        cardsWrap.appendChild(card);
      });

      group.appendChild(label);
      group.appendChild(cardsWrap);
      fragment.appendChild(group);
    });

    gallery.appendChild(fragment);
  }

  // ---- Lightbox ----
  function openLightbox(sIdx, imgIdx) {
    seriesIndex = sIdx;
    imageIndex  = imgIdx || 0;
    updateLightbox();
    lightbox.hidden = false;
    void lightbox.offsetHeight;
    lightbox.classList.add("is-visible");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("is-visible");
    document.body.style.overflow = "";
    setTimeout(() => { lightbox.hidden = true; }, 300);
  }

  function updateLightbox() {
    const series = currentSeries[seriesIndex];
    const images = series.images;
    const current = images[imageIndex];

    lightboxImg.src = imgSrc(current);
    lightboxImg.alt = series.title;

    const caption = getCaption(current) || series.description || "";
    lightboxCaption.textContent = caption;

    if (images.length > 1) {
      lightboxCounter.textContent = (imageIndex + 1) + " / " + images.length;
      lightboxCounter.style.display = "";
    } else {
      lightboxCounter.textContent = "";
      lightboxCounter.style.display = "none";
    }

    const multi = images.length > 1;
    btnPrev.classList.toggle("is-hidden", !multi);
    btnNext.classList.toggle("is-hidden", !multi);
  }

  function navigate(dir) {
    const images = currentSeries[seriesIndex].images;
    imageIndex = (imageIndex + dir + images.length) % images.length;
    updateLightbox();
  }

  function bindLightbox() {
    gallery.addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      const sIdx = Number(card.dataset.series);
      const clickedImg = e.target.closest("img[data-img-idx]");
      const imgIdx = clickedImg ? Number(clickedImg.dataset.imgIdx) : 0;
      openLightbox(sIdx, imgIdx);
    });

    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
    btnPrev.addEventListener("click", (e) => { e.stopPropagation(); navigate(-1); });
    btnNext.addEventListener("click", (e) => { e.stopPropagation(); navigate(1);  });

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (lightbox.hidden) return;
      if (e.key === "Escape")     closeLightbox();
      if (e.key === "ArrowLeft")  navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    lightbox.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      touchStartTime = Date.now();
    }, { passive: true });

    lightbox.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      const dy = e.changedTouches[0].screenY - touchStartY;
      const dt = Date.now() - touchStartTime;

      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 3 && dt < 500) {
        if (dx < 0) navigate(1);
        else        navigate(-1);
      }
    }, { passive: true });
  }

  // ---- Image protection ----
  function bindProtection() {
    document.addEventListener("contextmenu", (e) => {
      if (e.target.tagName === "IMG" || e.target.closest(".card") || e.target.closest(".lightbox")) {
        e.preventDefault();
      }
    });

    document.addEventListener("dragstart", (e) => {
      if (e.target.tagName === "IMG") {
        e.preventDefault();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
