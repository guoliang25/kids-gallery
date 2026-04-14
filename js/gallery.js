(function () {
  "use strict";

  const ARTWORKS_URL = "data/artworks.json";
  const IMAGE_BASE  = "images/artworks/";

  let allData = {};        // { yoga: [...], siyu: [...] }
  let currentTab = "yoga";
  let currentArtworks = [];
  let currentIndex = -1;

  // ---- DOM refs ----
  const gallery         = document.getElementById("gallery");
  const lightbox        = document.getElementById("lightbox");
  const lightboxImg     = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");

  // ---- Init ----
  async function init() {
    try {
      const res = await fetch(ARTWORKS_URL);
      allData = await res.json();
    } catch (err) {
      gallery.innerHTML = '<p class="empty-state">暂无作品，敬请期待！</p>';
      console.error("Failed to load artworks:", err);
      return;
    }

    bindTabs();
    bindLightbox();
    switchTab("yoga");
  }

  // ---- Tabs ----
  function bindTabs() {
    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        switchTab(btn.dataset.tab);
      });
    });
  }

  function switchTab(tab) {
    currentTab = tab;

    // Update active button
    document.querySelectorAll(".tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    // Get artworks for this tab, sort by date descending
    currentArtworks = (allData[tab] || []).slice();
    currentArtworks.sort((a, b) => b.date.localeCompare(a.date));

    renderGallery();
  }

  // ---- Render ----
  function renderGallery() {
    gallery.innerHTML = "";

    if (currentArtworks.length === 0) {
      gallery.innerHTML = '<p class="empty-state">暂无作品，敬请期待！</p>';
      return;
    }

    const fragment = document.createDocumentFragment();

    currentArtworks.forEach((art, index) => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.index = index;

      const img = document.createElement("img");
      img.alt = art.title;
      img.loading = "lazy";
      img.src = IMAGE_BASE + currentTab + "/" + art.file;

      const info = document.createElement("div");
      info.className = "card-info";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = art.title;

      const meta = document.createElement("div");
      meta.className = "card-meta";

      const dateSpan = document.createElement("span");
      dateSpan.textContent = art.date;

      const descSpan = document.createElement("span");
      descSpan.textContent = art.description || "";

      meta.appendChild(dateSpan);
      meta.appendChild(descSpan);
      info.appendChild(title);
      info.appendChild(meta);
      card.appendChild(img);
      card.appendChild(info);
      fragment.appendChild(card);
    });

    gallery.appendChild(fragment);
  }

  // ---- Lightbox ----
  function openLightbox(index) {
    currentIndex = index;
    updateLightboxContent();
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

  function updateLightboxContent() {
    const art = currentArtworks[currentIndex];
    lightboxImg.src = IMAGE_BASE + currentTab + "/" + art.file;
    lightboxImg.alt = art.title;
    lightboxCaption.textContent = art.title + "  ·  " + art.date +
      (art.description ? "  ·  " + art.description : "");
  }

  function navigate(direction) {
    currentIndex = (currentIndex + direction + currentArtworks.length) % currentArtworks.length;
    updateLightboxContent();
  }

  function bindLightbox() {
    gallery.addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      openLightbox(Number(card.dataset.index));
    });

    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);

    lightbox.querySelector(".lightbox-prev").addEventListener("click", (e) => {
      e.stopPropagation();
      navigate(-1);
    });

    lightbox.querySelector(".lightbox-next").addEventListener("click", (e) => {
      e.stopPropagation();
      navigate(1);
    });

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (lightbox.hidden) return;
      if (e.key === "Escape")     closeLightbox();
      if (e.key === "ArrowLeft")  navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    });
  }

  // ---- Start ----
  document.addEventListener("DOMContentLoaded", init);
})();
