const content = document.querySelector("#page-content");
const path = window.location.pathname.replace(/\/$/, "") || "/";
const search = new URLSearchParams(window.location.search);
const routeInfo = {
  "/destinations": {
    key: "destinations",
    title: "Discover the destinations",
    emphasis: "destinations",
    eyebrow: "FIND YOUR NEXT ADVENTURE",
    description: "Explore the famous valleys, mountain lakes, and wild landscapes of Gilgit-Baltistan. Follow each place into its stories and travel guides.",
  },
  "/guides": {
    key: "guides",
    title: "Plan your journey",
    emphasis: "journey",
    eyebrow: "PRACTICAL TRAVEL GUIDES",
    description: "Explore first-hand destination guides, local highlights, and practical tips to help plan a trip through northern Pakistan.",
  },
  "/videos": {
    key: "videos",
    title: "Come along for the ride",
    emphasis: "ride",
    eyebrow: "TRAVEL VIDEOS FROM THE NORTH",
    description: "Travel along mountain roads, discover new corners of Gilgit-Baltistan, and meet the places through video stories.",
  },
  "/about": {
    key: "about",
    title: "I explore. You discover.",
    emphasis: "discover",
    eyebrow: "THE CREATOR BEHIND DISCOVERGB.PK",
    description: "Meet the creator and discover the purpose behind sharing the journeys, places, and people of Gilgit-Baltistan.",
  },
};
const page = routeInfo[path];

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderStory(story) {
  const card = makeElement("article", "story-card");
  const coverLink = makeElement("a", "story-image-button");
  coverLink.href = `/story/${encodeURIComponent(story.slug)}`;
  const image = document.createElement("img");
  image.src = story.image;
  image.alt = story.title;
  image.loading = "lazy";
  coverLink.append(image, makeElement("span", "story-badge", story.category === "video" ? "TRAVEL VIDEO" : "PHOTO GUIDE"));
  if (story.category === "video") coverLink.append(makeElement("span", "story-play", "▶"));

  const copy = makeElement("div", "story-copy");
  copy.append(makeElement("p", "story-meta", `${story.location.toUpperCase()} · ${story.readTime.toUpperCase()}`));
  const title = makeElement("h3");
  const titleLink = makeElement("a", "story-title-button", story.title);
  titleLink.href = `/story/${encodeURIComponent(story.slug)}`;
  title.append(titleLink);
  copy.append(title, makeElement("p", "", story.excerpt));
  const readLink = makeElement("a", "read-link", story.category === "video" ? "WATCH THE JOURNEY →" : "READ THE GUIDE →");
  readLink.href = `/story/${encodeURIComponent(story.slug)}`;
  copy.append(readLink);
  card.append(coverLink, copy);
  return card;
}

function renderDestinations() {
  const section = makeElement("section", "interior-section");
  const heading = makeElement("div", "section-heading");
  const titleGroup = makeElement("div");
  titleGroup.append(makeElement("p", "eyebrow", "THREE WAYS INTO THE NORTH"));
  const title = makeElement("h2");
  title.append(document.createTextNode("Choose your "), makeElement("em", "", "next stop."));
  titleGroup.append(title);
  heading.append(titleGroup);

  const grid = makeElement("div", "destination-grid");
  const destinations = [
    {
      name: "Hunza Valley",
      kicker: "THE CLASSIC JOURNEY",
      description: "Mountain scenery, lakes, villages, and winding roads through Upper Hunza.",
      search: "Hunza",
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
      alt: "High mountains in the Hunza region",
      featured: true,
    },
    {
      name: "Skardu & Baltistan",
      kicker: "LAKES & LANDSCAPES",
      description: "Discover Baltistan, its mountain lakes, and the journey beside the Indus.",
      search: "Skardu",
      image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=850&q=85",
      alt: "Alpine lake and mountain scenery",
    },
    {
      name: "Deosai Plains",
      kicker: "WILD & WIDE OPEN",
      description: "Explore the high plains and find practical advice before you go.",
      search: "Deosai",
      image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=850&q=85",
      alt: "Wide mountain wilderness",
    },
  ];

  for (const destination of destinations) {
    const link = makeElement("a", `destination-card${destination.featured ? " destination-large" : ""}`);
    link.href = `/guides?search=${encodeURIComponent(destination.search)}`;
    const image = document.createElement("img");
    image.src = destination.image;
    image.alt = destination.alt;
    image.loading = "lazy";
    const label = makeElement("span", "destination-label");
    label.append(
      makeElement("small", "", destination.kicker),
      makeElement("strong", "", destination.name),
      makeElement("span", "", destination.description),
    );
    link.append(image, makeElement("span", "destination-overlay"), label);
    grid.append(link);
  }
  section.append(heading, grid);
  const note = makeElement("p", "destination-note", "DiscoverGB.pk is growing as new journeys are explored. These destination sections link to published stories about each place.");
  section.append(note);
  return section;
}

function renderAbout() {
  const section = makeElement("section", "interior-section interior-about");
  const image = document.createElement("img");
  image.src = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85";
  image.alt = "Mountain peaks in the Karakoram region";
  const copy = makeElement("div");
  copy.append(makeElement("p", "eyebrow", "TRAVEL CREATOR · GILGIT-BALTISTAN"));
  const title = makeElement("h2");
  title.append(document.createTextNode("I explore. "), makeElement("em", "", "You discover."));
  copy.append(title);
  copy.append(
    makeElement("p", "", "I’m the travel creator behind DiscoverGB.pk. I explore Gilgit-Baltistan, make videos from the journey, and share the places, people, and experiences I find along the way."),
    makeElement("p", "", "There’s so much more to the north than the places everyone already knows. My goal is to discover new areas, tell their stories, and inspire more tourists to visit Gilgit-Baltistan with curiosity and respect."),
    makeElement("p", "", "From the famous valleys of Hunza to the lesser-known roads and communities, this site is a growing collection of real journeys to help you imagine and plan your own."),
  );
  const contact = makeElement("a", "read-link", "FOLLOW THE JOURNEY →");
  contact.href = "/#follow";
  copy.append(contact);
  section.append(image, copy);
  return section;
}

async function renderPage() {
  if (!page) {
    content.append(makeElement("p", "page-error", "Page not found."));
    return;
  }

  document.title = `${page.title.replace(/\.$/, "")} — DiscoverGB.pk`;
  document.querySelector('meta[name="description"]').content = page.description;
  const heading = makeElement("header", "page-banner");
  heading.append(makeElement("p", "eyebrow", page.eyebrow));
  const title = makeElement("h1");
  const titleText = page.title;
  const emphasisText = page.emphasis;
  const emphasisIndex = titleText.toLowerCase().lastIndexOf(emphasisText.toLowerCase());
  if (emphasisIndex >= 0) {
    title.append(
      document.createTextNode(titleText.slice(0, emphasisIndex)),
      makeElement("em", "", titleText.slice(emphasisIndex, emphasisIndex + emphasisText.length)),
      document.createTextNode(titleText.slice(emphasisIndex + emphasisText.length)),
    );
  } else {
    title.textContent = titleText;
  }
  heading.append(title, makeElement("p", "", page.description));
  content.append(heading);

  if (page.key === "destinations") {
    content.append(renderDestinations());
    return;
  }
  if (page.key === "about") {
    content.append(renderAbout());
    return;
  }

  const section = makeElement("section", "interior-section");
  const sectionHeading = makeElement("div", "section-heading");
  const titleGroup = makeElement("div");
  titleGroup.append(makeElement("p", "eyebrow", page.key === "videos" ? "JOURNEYS THROUGH THE LENS" : "EXPLORE THE DESTINATIONS"));
  const headingText = page.key === "videos" ? "Watch the " : "Read the ";
  const headingEmphasis = page.key === "videos" ? "journeys." : "travel guides.";
  const sectionTitle = makeElement("h2");
  sectionTitle.append(document.createTextNode(headingText), makeElement("em", "", headingEmphasis));
  titleGroup.append(sectionTitle);
  sectionHeading.append(titleGroup);

  const count = makeElement("span", "story-count", "LOADING STORIES");
  sectionHeading.append(count);
  const grid = makeElement("div", "story-grid");
  const empty = makeElement("p", "results-notice", "Loading stories…");
  section.append(sectionHeading, grid, empty);
  content.append(section);

  try {
    const response = await fetch("/api/stories");
    const stories = await response.json();
    if (!response.ok) throw new Error(stories.error || "Travel stories could not be loaded.");
    const filtered = stories.filter((story) => page.key === "videos" ? story.category === "video" : story.category === "guide");
    const query = search.get("search")?.trim().toLowerCase() || "";
    const results = filtered.filter((story) => !query || `${story.title} ${story.location} ${story.excerpt}`.toLowerCase().includes(query));
    count.textContent = `${results.length} ${page.key === "videos" ? "VIDEOS" : "GUIDES"}`;
    empty.textContent = results.length ? "" : query ? `No stories found for “${query}”. Try a different search or explore all ${page.key === "videos" ? "videos" : "guides"}.` : "New stories are on their way. Please check back soon.";
    if (results.length) empty.hidden = true;
    else empty.classList.add("is-visible");
    grid.append(...results.map(renderStory));
  } catch (error) {
    count.textContent = "STORIES UNAVAILABLE";
    empty.textContent = error.message;
    empty.classList.add("is-visible");
    console.error("Unable to load travel stories:", error);
  }
}

const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const searchToggle = document.querySelector(".search-toggle");
const searchPanel = document.querySelector("#search-panel");
const searchInput = document.querySelector("#site-search");

document.querySelectorAll("[data-page-link]").forEach((link) => {
  if (link.dataset.pageLink === page?.key) link.setAttribute("aria-current", "page");
});

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  mainNav.classList.toggle("is-open", isOpen);
  if (isOpen) {
    searchPanel.classList.remove("is-open");
    searchToggle.setAttribute("aria-expanded", "false");
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
    searchInput.focus();
  }
});

searchPanel.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  window.location.href = `/guides${query ? `?search=${encodeURIComponent(query)}` : ""}`;
});

document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

document.querySelector("#current-year").textContent = String(new Date().getFullYear());
renderPage();
