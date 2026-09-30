/**
 * Purushotham Vilasagaram - SDET Portfolio & Medium Integration
 * Live Medium RSS Feed Sync, Dynamic Filtering, Fallback Editorial Covers, Search & Bookmarks
 */

// --------------------------------------------------------------------------
// Configuration & State
// --------------------------------------------------------------------------
const DEFAULT_MEDIUM_HANDLE = "purushotham.sdet";
let currentMediumHandle = localStorage.getItem("pv_medium_handle") || DEFAULT_MEDIUM_HANDLE;

let mediumArticles = [];
let availableCategories = new Set();
let activeCategory = "all";
let searchQuery = "";
let bookmarkedArticleGuids = JSON.parse(localStorage.getItem("pv_medium_bookmarks") || "[]");
let currentOpenArticle = null;

// Curated Gradient Palettes for Image-Free Articles
const GRADIENT_THEMES = [
  { bg: "linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)", icon: "fa-solid fa-code", label: "Software Engineering" },
  { bg: "linear-gradient(135deg, #064e3b 0%, #059669 100%)", icon: "fa-solid fa-vial-circle-check", label: "Quality Assurance" },
  { bg: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)", icon: "fa-solid fa-gears", label: "Automation & CI/CD" },
  { bg: "linear-gradient(135deg, #831843 0%, #db2777 100%)", icon: "fa-solid fa-wand-magic-sparkles", label: "AI & Innovation" },
  { bg: "linear-gradient(135deg, #0f172a 0%, #334155 100%)", icon: "fa-solid fa-network-wired", label: "API & Protocols" },
  { bg: "linear-gradient(135deg, #78350f 0%, #d97706 100%)", icon: "fa-solid fa-bug-slash", label: "Root Cause Triage" }
];

// --------------------------------------------------------------------------
// DOM Elements
// --------------------------------------------------------------------------
const articlesGrid = document.getElementById("articlesGrid");
const loadingSkeletonGrid = document.getElementById("loadingSkeletonGrid");
const noResultsState = document.getElementById("noResultsState");
const emptyStateTitle = document.getElementById("emptyStateTitle");
const emptyStateDesc = document.getElementById("emptyStateDesc");
const currentHandleText = document.getElementById("currentHandleText");
const searchInput = document.getElementById("articleSearchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const resetSearchBtn = document.getElementById("resetSearchBtn");
const categoryFilterBar = document.getElementById("categoryFilterBar");

// Medium Profile & Sync Bar
const mediumHandleBadge = document.getElementById("mediumHandleBadge");
const syncStatusText = document.getElementById("syncStatusText");
const articleCountStatus = document.getElementById("articleCountStatus");
const followMediumBtn = document.getElementById("followMediumBtn");
const contactMediumLink = document.getElementById("contactMediumLink");
const footerMediumLink = document.getElementById("footerMediumLink");
const refreshFeedBtn = document.getElementById("refreshFeedBtn");
const changeMediumHandleBtn = document.getElementById("changeMediumHandleBtn");

// Handle Config Modal
const handleConfigModal = document.getElementById("handleConfigModal");
const closeHandleModalBtn = document.getElementById("closeHandleModalBtn");
const cancelHandleBtn = document.getElementById("cancelHandleBtn");
const mediumHandleForm = document.getElementById("mediumHandleForm");
const customHandleInput = document.getElementById("customHandleInput");

// Article Reader / Preview Modal
const articleModal = document.getElementById("articleReaderModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalCategory = document.getElementById("modalArticleCategory");
const modalReadTime = document.getElementById("modalArticleReadTime");
const modalTitle = document.getElementById("modalArticleTitle");
const modalDate = document.getElementById("modalArticleDate");
const modalTags = document.getElementById("modalArticleTags");
const modalBody = document.getElementById("modalArticleBody");
const modalAuthorName = document.getElementById("modalAuthorName");
const modalExternalLink = document.getElementById("modalExternalLink");
const modalBottomMediumBtn = document.getElementById("modalBottomMediumBtn");
const modalBookmarkBtn = document.getElementById("modalBookmarkBtn");

// Bookmarks Drawer
const bookmarkDrawerBtn = document.getElementById("bookmarkDrawerBtn");
const bookmarkCountBadge = document.getElementById("bookmarkCountBadge");
const bookmarksDrawer = document.getElementById("bookmarksDrawer");
const closeBookmarksBtn = document.getElementById("closeBookmarksBtn");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const bookmarksList = document.getElementById("bookmarksList");

// Theme Toggle
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");

// Progress & Utility
const readingProgressBar = document.getElementById("readingProgressBar");
const currentYearSpan = document.getElementById("currentYear");
const mobileMenuToggle = document.getElementById("mobileMenuToggle");
const navMenu = document.getElementById("navMenu");
const contactForm = document.getElementById("contactForm");
const newsletterForm = document.getElementById("newsletterForm");

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  initTheme();
  updateMediumProfileUI();
  fetchMediumFeed();
  updateBookmarkBadge();
  setupEventListeners();
});

// --------------------------------------------------------------------------
// Medium Profile & Link Synchronization
// --------------------------------------------------------------------------
function updateMediumProfileUI() {
  const cleanHandle = currentMediumHandle.replace(/^@/, "").trim();
  const profileUrl = `https://medium.com/@${cleanHandle}`;

  if (mediumHandleBadge) mediumHandleBadge.textContent = `@${cleanHandle}`;
  if (currentHandleText) currentHandleText.textContent = `@${cleanHandle}`;
  if (followMediumBtn) followMediumBtn.href = profileUrl;
  if (contactMediumLink) {
    contactMediumLink.href = profileUrl;
    contactMediumLink.textContent = `medium.com/@${cleanHandle}`;
  }
  if (footerMediumLink) footerMediumLink.href = profileUrl;
}

// --------------------------------------------------------------------------
// Fetch Live Medium RSS Feed
// --------------------------------------------------------------------------
async function fetchMediumFeed() {
  const cleanHandle = currentMediumHandle.replace(/^@/, "").trim();
  const rssUrl = `https://medium.com/feed/@${cleanHandle}`;
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  // Show loading skeleton
  if (loadingSkeletonGrid) loadingSkeletonGrid.classList.remove("hidden");
  if (articlesGrid) articlesGrid.classList.add("hidden");
  if (noResultsState) noResultsState.classList.add("hidden");
  if (syncStatusText) syncStatusText.textContent = "Syncing with Medium...";
  if (articleCountStatus) articleCountStatus.textContent = "Connecting...";

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === "ok" && Array.isArray(data.items) && data.items.length > 0) {
      processMediumArticles(data.items, data.feed);
      if (syncStatusText) syncStatusText.textContent = "Live Connected to Medium";
      if (articleCountStatus) articleCountStatus.textContent = `${data.items.length} stories synced`;
    } else {
      // Empty feed or no stories published yet
      handleEmptyFeed("No published stories found under this Medium handle yet.");
    }
  } catch (error) {
    console.warn("Medium RSS Fetch Notice:", error);
    handleEmptyFeed("Could not retrieve stories. Check your internet connection or verify your Medium handle.");
  } finally {
    if (loadingSkeletonGrid) loadingSkeletonGrid.classList.add("hidden");
  }
}

// --------------------------------------------------------------------------
// Process & Sanitize Medium Articles
// --------------------------------------------------------------------------
function processMediumArticles(rawItems, feedInfo) {
  availableCategories.clear();
  availableCategories.add("all");

  mediumArticles = rawItems.map((item, index) => {
    // Extract thumbnail, ignoring Medium tracking pixels
    let thumbnail = item.thumbnail || "";
    if (thumbnail && (thumbnail.includes("/_/stat") || thumbnail.includes("stat?event="))) {
      thumbnail = "";
    }

    if (!thumbnail && item.description) {
      const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch && imgMatch[1]) {
        const src = imgMatch[1];
        if (!src.includes("/_/stat") && !src.includes("stat?event=")) {
          thumbnail = src;
        }
      }
    }

    // Clean plain text excerpt
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = item.description || item.content || "";
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    const excerpt = plainText.slice(0, 190).trim() + (plainText.length > 190 ? "..." : "");

    // Calculate approximate read time
    const wordCount = plainText.split(/\s+/).length;
    const readMinutes = Math.max(1, Math.ceil(wordCount / 200));

    // Format publication date
    const dateObj = new Date(item.pubDate);
    const formattedDate = !isNaN(dateObj)
      ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : item.pubDate;

    // Categories / Tags
    const categories = Array.isArray(item.categories) && item.categories.length > 0
      ? item.categories
      : ["Technology", "Test Automation"];

    categories.forEach(cat => availableCategories.add(cat.toLowerCase()));

    // Assign gradient theme for fallback covers
    const themeIndex = Math.abs(hashCode(item.title || index.toString())) % GRADIENT_THEMES.length;
    const theme = GRADIENT_THEMES[themeIndex];

    return {
      guid: item.guid || item.link || `medium-post-${index}`,
      title: item.title,
      link: item.link,
      author: item.author || feedInfo?.title || "Purushotham Vilasagaram",
      pubDate: formattedDate,
      thumbnail: thumbnail,
      theme: theme,
      excerpt: excerpt,
      contentHtml: item.content || item.description || `<p>${excerpt}</p>`,
      categories: categories,
      readTime: `${readMinutes} min read`,
    };
  });

  renderCategoryPills();
  renderArticles();
}

// Utility: Generate consistent hash code for title styling
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function handleEmptyFeed(message) {
  mediumArticles = [];
  if (syncStatusText) syncStatusText.textContent = "Live Feed Idle";
  if (articleCountStatus) articleCountStatus.textContent = "0 stories published";
  if (emptyStateTitle) emptyStateTitle.textContent = "No Published Medium Stories Found";
  if (emptyStateDesc) {
    emptyStateDesc.innerHTML = `${message}<br><br>As soon as you publish an article on Medium under <strong id="currentHandleText">@${currentMediumHandle.replace(/^@/, '')}</strong>, it will automatically sync and appear right here!`;
  }
  if (articlesGrid) articlesGrid.classList.add("hidden");
  if (noResultsState) noResultsState.classList.remove("hidden");
}

// --------------------------------------------------------------------------
// Render Dynamic Category Pills
// --------------------------------------------------------------------------
function renderCategoryPills() {
  if (!categoryFilterBar) return;

  const cats = Array.from(availableCategories);
  categoryFilterBar.innerHTML = cats.map(cat => {
    const isAll = cat === "all";
    const displayName = isAll ? "All Stories" : cat.charAt(0).toUpperCase() + cat.slice(1);
    const isActive = activeCategory === cat;
    return `
      <button class="cat-pill ${isActive ? 'active' : ''}" data-category="${cat}" role="tab" aria-selected="${isActive}">
        ${displayName}
      </button>
    `;
  }).join("");

  categoryFilterBar.querySelectorAll(".cat-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      categoryFilterBar.querySelectorAll(".cat-pill").forEach(p => {
        p.classList.remove("active");
        p.setAttribute("aria-selected", "false");
      });
      pill.classList.add("active");
      pill.setAttribute("aria-selected", "true");
      activeCategory = pill.getAttribute("data-category");
      renderArticles();
    });
  });
}

// --------------------------------------------------------------------------
// Render Articles Grid with Smart Editorial Fallback Covers
// --------------------------------------------------------------------------
function renderArticles() {
  if (mediumArticles.length === 0) {
    if (articlesGrid) articlesGrid.classList.add("hidden");
    if (noResultsState) noResultsState.classList.remove("hidden");
    return;
  }

  const q = searchQuery.toLowerCase().trim();
  const filtered = mediumArticles.filter(article => {
    const matchesCategory = activeCategory === "all" || article.categories.some(c => c.toLowerCase() === activeCategory);
    const matchesSearch = !q ||
      article.title.toLowerCase().includes(q) ||
      article.excerpt.toLowerCase().includes(q) ||
      article.categories.some(c => c.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    if (articlesGrid) articlesGrid.classList.add("hidden");
    if (noResultsState) {
      noResultsState.classList.remove("hidden");
      if (emptyStateTitle) emptyStateTitle.textContent = "No matching stories found";
      if (emptyStateDesc) emptyStateDesc.textContent = "Try searching with different keywords or switch the topic filter.";
    }
    return;
  }

  if (noResultsState) noResultsState.classList.add("hidden");
  if (articlesGrid) {
    articlesGrid.classList.remove("hidden");
    articlesGrid.innerHTML = filtered.map(article => {
      const isBookmarked = bookmarkedArticleGuids.includes(article.guid);
      const primaryCategory = article.categories[0] || "Engineering";

      // If thumbnail exists, render image with automatic onerror fallback to editorial cover
      // If NO thumbnail exists, render elegant editorial gradient banner
      const thumbHtml = article.thumbnail
        ? `
          <div class="article-thumb-wrapper">
            <img src="${article.thumbnail}" alt="${article.title}" loading="lazy" class="article-thumb-img" onerror="handleImageError(this, '${article.guid}')">
          </div>
        `
        : generateEditorialCoverHtml(article, primaryCategory);

      return `
        <article class="article-card medium-card glassmorphism" onclick="openArticleModal('${article.guid}')" data-guid="${article.guid}">
          ${thumbHtml}
          <div class="card-top">
            <div class="article-meta-row">
              <span class="badge badge-medium"><i class="fa-brands fa-medium"></i> Medium</span>
              <span><i class="fa-regular fa-clock"></i> ${article.readTime}</span>
              <span><i class="fa-regular fa-calendar"></i> ${article.pubDate}</span>
            </div>
            <h3 class="article-card-title">${article.title}</h3>
            <p class="article-card-excerpt">${article.excerpt}</p>
            <div class="article-tags-wrap">
              ${article.categories.map(c => `<span class="tag-badge">#${c}</span>`).join("")}
            </div>
          </div>
          <div class="card-bottom">
            <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="read-btn-link" onclick="event.stopPropagation()">
              Read on Medium <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
            <button class="action-btn icon-btn" title="Save Story" onclick="toggleBookmark('${article.guid}', event)">
              <i class="${isBookmarked ? 'fa-solid text-highlight' : 'fa-regular'} fa-bookmark"></i>
            </button>
          </div>
        </article>
      `;
    }).join("");
  }
}

// Generates an elegant magazine-style editorial cover banner when no image is uploaded on Medium
function generateEditorialCoverHtml(article, primaryCategory) {
  const theme = article.theme || GRADIENT_THEMES[0];
  return `
    <div class="article-editorial-cover" style="background: ${theme.bg};">
      <div class="editorial-pattern-overlay"></div>
      <div class="editorial-top-row">
        <span class="editorial-topic-badge"><i class="${theme.icon}"></i> ${primaryCategory}</span>
        <span class="editorial-brand-logo"><i class="fa-brands fa-medium"></i></span>
      </div>
      <div class="editorial-center-icon">
        <i class="${theme.icon}"></i>
      </div>
      <div class="editorial-bottom-watermark">
        <span>PURUSHOTHAM &bull; TECH INSIGHTS</span>
      </div>
    </div>
  `;
}

// Global Image Error Handler to prevent broken image icons
window.handleImageError = function(imgElement, guid) {
  const article = mediumArticles.find(a => a.guid === guid);
  const primaryCategory = article?.categories[0] || "Engineering";
  const parent = imgElement.closest(".article-thumb-wrapper");
  if (parent) {
    parent.outerHTML = generateEditorialCoverHtml(article || {}, primaryCategory);
  }
};

// --------------------------------------------------------------------------
// Article Modal & Preview
// --------------------------------------------------------------------------
function openArticleModal(guid) {
  const article = mediumArticles.find(a => a.guid === guid);
  if (!article) return;

  currentOpenArticle = article;
  modalTitle.textContent = article.title;
  modalDate.textContent = article.pubDate;
  modalAuthorName.textContent = article.author;
  modalReadTime.textContent = article.readTime;
  modalCategory.innerHTML = `<i class="fa-brands fa-medium"></i> Medium Story`;
  modalExternalLink.href = article.link;
  modalBottomMediumBtn.href = article.link;

  modalTags.innerHTML = article.categories.map(c => `<span class="tag-badge">#${c}</span>`).join("");
  modalBody.innerHTML = article.contentHtml;

  updateModalBookmarkIcon();

  articleModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeArticleModal() {
  articleModal.classList.add("hidden");
  document.body.style.overflow = "";
  currentOpenArticle = null;
}

function updateModalBookmarkIcon() {
  if (!modalBookmarkBtn || !currentOpenArticle) return;
  const isBookmarked = bookmarkedArticleGuids.includes(currentOpenArticle.guid);
  modalBookmarkBtn.innerHTML = `<i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>`;
  modalBookmarkBtn.style.color = isBookmarked ? "var(--accent-light)" : "";
}

// --------------------------------------------------------------------------
// Bookmarks Logic (LocalStorage)
// --------------------------------------------------------------------------
function toggleBookmark(guid, event) {
  if (event) event.stopPropagation();

  if (bookmarkedArticleGuids.includes(guid)) {
    bookmarkedArticleGuids = bookmarkedArticleGuids.filter(id => id !== guid);
    showToast("Removed from saved stories", "info");
  } else {
    bookmarkedArticleGuids.push(guid);
    showToast("Saved Medium story to reading list!", "success");
  }

  localStorage.setItem("pv_medium_bookmarks", JSON.stringify(bookmarkedArticleGuids));
  updateBookmarkBadge();
  renderArticles();
  renderBookmarksDrawerList();
  if (currentOpenArticle && currentOpenArticle.guid === guid) {
    updateModalBookmarkIcon();
  }
}

function updateBookmarkBadge() {
  if (!bookmarkCountBadge) return;
  const count = bookmarkedArticleGuids.length;
  if (count > 0) {
    bookmarkCountBadge.textContent = count;
    bookmarkCountBadge.classList.remove("hidden");
  } else {
    bookmarkCountBadge.classList.add("hidden");
  }
}

function renderBookmarksDrawerList() {
  if (!bookmarksList) return;

  if (bookmarkedArticleGuids.length === 0) {
    bookmarksList.innerHTML = `
      <div class="text-center" style="padding: 40px 10px; color: var(--text-muted);">
        <i class="fa-regular fa-bookmark" style="font-size: 2.5rem; margin-bottom: 12px; display: block;"></i>
        <p>No Medium stories saved yet.</p>
        <span style="font-size: 0.8rem;">Click the bookmark icon on any Medium card to save it for later.</span>
      </div>
    `;
    return;
  }

  const savedArticles = mediumArticles.filter(a => bookmarkedArticleGuids.includes(a.guid));
  bookmarksList.innerHTML = savedArticles.map(a => `
    <div class="bookmark-item-card" onclick="openArticleModal('${a.guid}'); toggleBookmarksDrawer(false);">
      <h4 class="bookmark-item-title">${a.title}</h4>
      <div class="bookmark-item-meta">
        <span><i class="fa-regular fa-clock"></i> ${a.readTime}</span>
        <button class="remove-bookmark-btn" title="Remove" onclick="toggleBookmark('${a.guid}', event)">
          <i class="fa-solid fa-trash-can"></i> Remove
        </button>
      </div>
    </div>
  `).join("");
}

function toggleBookmarksDrawer(open) {
  if (open) {
    renderBookmarksDrawerList();
    bookmarksDrawer.classList.remove("hidden");
    drawerBackdrop.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  } else {
    bookmarksDrawer.classList.add("hidden");
    drawerBackdrop.classList.add("hidden");
    if (!currentOpenArticle) {
      document.body.style.overflow = "";
    }
  }
}

// --------------------------------------------------------------------------
// Theme Toggle (Dark / Light)
// --------------------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem("pv_theme");
  const systemPrefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  
  const currentTheme = savedTheme || (systemPrefersLight ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeIcon(currentTheme);
}

function updateThemeIcon(theme) {
  if (!themeIcon) return;
  if (theme === "light") {
    themeIcon.classList.remove("fa-moon");
    themeIcon.classList.add("fa-sun");
  } else {
    themeIcon.classList.remove("fa-sun");
    themeIcon.classList.add("fa-moon");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("pv_theme", newTheme);
  updateThemeIcon(newTheme);
  showToast(`Switched to ${newTheme === 'dark' ? 'Corporate Navy Dark' : 'Slate Crisp Light'} mode`, "info");
}

// --------------------------------------------------------------------------
// Reading Progress Bar
// --------------------------------------------------------------------------
window.addEventListener("scroll", () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const progress = (scrollTop / scrollHeight) * 100;
  if (readingProgressBar) {
    readingProgressBar.style.width = `${progress}%`;
  }
});

// --------------------------------------------------------------------------
// Toast Notification Utility
// --------------------------------------------------------------------------
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --------------------------------------------------------------------------
// Event Listeners Setup
// --------------------------------------------------------------------------
function setupEventListeners() {
  // Theme Toggle
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  // Refresh Medium Feed
  if (refreshFeedBtn) {
    refreshFeedBtn.addEventListener("click", () => {
      showToast("Syncing latest Medium feed...", "info");
      fetchMediumFeed();
    });
  }

  // Medium Handle Configurator Modal
  if (changeMediumHandleBtn) {
    changeMediumHandleBtn.addEventListener("click", () => {
      customHandleInput.value = currentMediumHandle.replace(/^@/, "");
      handleConfigModal.classList.remove("hidden");
      customHandleInput.focus();
    });
  }

  if (closeHandleModalBtn) {
    closeHandleModalBtn.addEventListener("click", () => handleConfigModal.classList.add("hidden"));
  }
  if (cancelHandleBtn) {
    cancelHandleBtn.addEventListener("click", () => handleConfigModal.classList.add("hidden"));
  }
  if (handleConfigModal) {
    handleConfigModal.addEventListener("click", (e) => {
      if (e.target === handleConfigModal) handleConfigModal.classList.add("hidden");
    });
  }

  if (mediumHandleForm) {
    mediumHandleForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const entered = customHandleInput.value.replace(/^@/, "").trim();
      if (!entered) return;

      currentMediumHandle = entered;
      localStorage.setItem("pv_medium_handle", entered);
      updateMediumProfileUI();
      handleConfigModal.classList.add("hidden");
      showToast(`Medium handle updated to @${entered}! Syncing stories...`, "success");
      fetchMediumFeed();
    });
  }

  // Search Input
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle("hidden", !searchQuery);
      }
      renderArticles();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      searchQuery = "";
      clearSearchBtn.classList.add("hidden");
      renderArticles();
      searchInput.focus();
    });
  }

  if (resetSearchBtn) {
    resetSearchBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      searchQuery = "";
      activeCategory = "all";
      renderCategoryPills();
      renderArticles();
    });
  }

  // Modal Close Events
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeArticleModal);
  }

  if (articleModal) {
    articleModal.addEventListener("click", (e) => {
      if (e.target === articleModal) {
        closeArticleModal();
      }
    });
  }

  if (modalBookmarkBtn) {
    modalBookmarkBtn.addEventListener("click", () => {
      if (currentOpenArticle) {
        toggleBookmark(currentOpenArticle.guid);
      }
    });
  }

  // Bookmarks Drawer Triggers
  if (bookmarkDrawerBtn) {
    bookmarkDrawerBtn.addEventListener("click", () => toggleBookmarksDrawer(true));
  }
  if (closeBookmarksBtn) {
    closeBookmarksBtn.addEventListener("click", () => toggleBookmarksDrawer(false));
  }
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener("click", () => toggleBookmarksDrawer(false));
  }

  // Mobile Menu
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", () => navMenu.classList.toggle("open"));
    navMenu.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", () => navMenu.classList.remove("open"));
    });
  }

  // Escape key handling
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!articleModal.classList.contains("hidden")) closeArticleModal();
      else if (!handleConfigModal.classList.contains("hidden")) handleConfigModal.classList.add("hidden");
      else if (!bookmarksDrawer.classList.contains("hidden")) toggleBookmarksDrawer(false);
    }
  });

  // Contact Form Submission
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("contactSubmitBtn");
      const origText = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending Message...`;

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
        contactForm.reset();
        showToast("Thank you! Your message has been sent successfully. Purushotham will reply promptly.", "success");
      }, 1000);
    });
  }

  // Newsletter Form Submission
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("newsletterEmail");
      const email = emailInput.value;

      emailInput.value = "";
      showToast(`Subscribed! Technical insights will be delivered to ${email}.`, "success");
    });
  }
}
