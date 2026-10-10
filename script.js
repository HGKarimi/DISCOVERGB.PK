const filterButtons = document.querySelectorAll(".filter-button");
const storyGrid = document.querySelector("#story-grid");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const searchToggle = document.querySelector(".search-toggle");
const searchPanel = document.querySelector("#search-panel");
const searchInput = document.querySelector("#site-search");
const storyCount = document.querySelector(".story-count");
const emptySearch = document.querySelector(".empty-search");
const mediaDialog = document.querySelector(".media-dialog");
const dialogContent = document.querySelector(".dialog-content");
const dialogTitle = document.querySelector(".dialog-title");
const dialogClose = document.querySelector(".dialog-close");
const currentYear = document.querySelector("#current-year");
let stories = [];
let activeFilter = "all";

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function videoEmbedUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
      const id = url.pathname.slice(1).split("/")[0];
      return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : "";
    }
    if (url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com")) {
      const id = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{6,20})/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
    }
    if (url.hostname === "vimeo.com" || url.hostname.endsWith(".vimeo.com")) {
      const id = url.pathname.match(/\/(\d{1,15})\/?$/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

function makePreviewButton(story, className, label) {
  const button = makeElement("button", className);
  button.type = "button";
  button.dataset.title = story.title;
  button.dataset.image = story.image;
  button.dataset.video = videoEmbedUrl(story.video);
  button.dataset.kind = story.category;
  button.setAttribute("aria-label", label);
  return button;
}

function renderStory(story) {
  const card = makeElement("article", "story-card");
  card.dataset.category = story.category;
  card.dataset.search = `${story.title} ${story.location} ${story.excerpt}`.toLowerCase();

  const imageButton = makePreviewButton(
    story,
    "story-image-button",
    story.category === "video" ? `Play ${story.title}` : `View ${story.title} photo`,
  );
  const image = document.createElement("img");
  image.src = story.image;
  image.alt = story.title;
  image.loading = "lazy";
  imageButton.append(image, makeElement("span", "story-badge", story.category === "video" ? "TRAVEL VIDEO" : "PHOTO GUIDE"));
  if (story.category === "video") imageButton.append(makeElement("span", "story-play", "▶"));

  const copy = makeElement("div", "story-copy");
  copy.append(makeElement("p", "story-meta", `${story.location.toUpperCase()} · ${story.readTime.toUpperCase()}`));
  const heading = makeElement("h3");
  const titleButton = makePreviewButton(story, "story-title-button", `Open ${story.title}`);
  titleButton.textContent = story.title;
  heading.append(titleButton);
  copy.append(heading, makeElement("p", "", story.excerpt));

  const readLink = makeElement("a", "read-link", story.category === "video" ? "WATCH THE JOURNEY →" : "READ THE GUIDE →");
  readLink.href = `/story/${encodeURIComponent(story.slug)}`;
  copy.append(readLink);
  card.append(imageButton, copy);
  return card;
}

function updateStories() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;
  const visibleCards = [...storyGrid.children];

  visibleCards.forEach((card) => {
    const matchesFilter = activeFilter === "all" || card.dataset.category === activeFilter;
    const matchesSearch = !searchTerm || card.dataset.search.includes(searchTerm);
    const isVisible = matchesFilter && matchesSearch;
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  storyCount.textContent = `SHOWING ${visibleCount} ${visibleCount === 1 ? "STORY" : "STORIES"}`;
  emptySearch.hidden = visibleCount !== 0;
}

async function loadStories() {
  storyGrid.replaceChildren();
  try {
    const response = await fetch("/api/stories");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Stories could not be loaded.");
    if (!Array.isArray(data)) throw new Error("The stories response is invalid.");
    stories = data;

    const videoCount = stories.filter((story) => story.category === "video").length;
    const guideCount = stories.filter((story) => story.category === "guide").length;
    filterButtons.forEach((button) => {
      const count = button.dataset.filter === "all" ? stories.length
        : button.dataset.filter === "video" ? videoCount
          : guideCount;
      button.querySelector("span").textContent = String(count).padStart(2, "0");
    });

    storyGrid.append(...stories.map(renderStory));
    updateStories();
  } catch (error) {
    storyCount.textContent = "STORIES UNAVAILABLE";
    emptySearch.hidden = false;
    emptySearch.textContent = error.message;
    console.error("Unable to load travel stories:", error);
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
    updateStories();
  });
});

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  mainNav.classList.toggle("is-open", isOpen);
  if (isOpen) {
    searchPanel.classList.remove("is-open");
    searchToggle.setAttribute("aria-expanded", "false");
    searchToggle.setAttribute("aria-label", "Open search");
  }
});

searchToggle.addEventListener("click", () => {
  const isOpen = searchToggle.getAttribute("aria-expanded") !== "true";
  searchToggle.setAttribute("aria-expanded", String(isOpen));
  searchToggle.setAttribute("aria-label", isOpen ? "Close search" : "Open search");
  searchPanel.classList.toggle("is-open", isOpen);
  if (isOpen) {
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    searchInput.focus();
  }
});

searchInput.addEventListener("input", updateStories);
searchPanel.addEventListener("submit", (event) => {
  event.preventDefault();
  searchPanel.classList.remove("is-open");
  searchToggle.setAttribute("aria-expanded", "false");
  searchToggle.setAttribute("aria-label", "Open search");
  document.querySelector("#stories").scrollIntoView({ behavior: "smooth" });
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    mainNav.classList.remove("is-open");
  });
});

storyGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".story-image-button, .story-title-button");
  if (!button) return;
  const { title, image, kind } = button.dataset;
  dialogContent.replaceChildren();

  if (kind === "video" && button.dataset.video) {
    const player = document.createElement("iframe");
    player.className = "dialog-video";
    player.src = button.dataset.video;
    player.title = title;
    player.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    player.referrerPolicy = "strict-origin-when-cross-origin";
    player.allowFullscreen = true;
    dialogContent.append(player);
  } else {
    const photo = document.createElement("img");
    photo.src = image;
    photo.alt = title;
    dialogContent.append(photo);
    if (kind === "video") {
      dialogContent.append(makeElement("p", "video-notice", "Add a YouTube or Vimeo link to this story in the creator dashboard to play its video."));
    }
  }

  dialogTitle.textContent = title;
  mediaDialog.showModal();
});

function closeMediaDialog() {
  if (mediaDialog.open) {
    mediaDialog.close();
    dialogContent.replaceChildren();
  }
}

dialogClose.addEventListener("click", closeMediaDialog);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeMediaDialog();
  searchPanel.classList.remove("is-open");
  searchToggle.setAttribute("aria-expanded", "false");
  searchToggle.setAttribute("aria-label", "Open search");
  mainNav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
});
mediaDialog.addEventListener("click", (event) => {
  if (event.target === mediaDialog) closeMediaDialog();
});
mediaDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeMediaDialog();
});
mediaDialog.addEventListener("close", () => dialogContent.replaceChildren());

currentYear.textContent = String(new Date().getFullYear());
loadStories();
