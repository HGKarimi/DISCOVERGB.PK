const article = document.querySelector("#article");

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function embedUrl(input) {
  try {
    const url = new URL(input);
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

function renderStory(story) {
  document.title = `${story.title} — DiscoverGB.pk`;
  document.querySelector('meta[name="description"]').content = story.excerpt;
  article.replaceChildren();
  article.append(makeElement("p", "eyebrow", story.category === "video" ? "TRAVEL VIDEO" : "DESTINATION GUIDE"));
  article.append(makeElement("h1", "", story.title));
  article.append(makeElement("p", "article-meta", `${story.location} · ${story.readTime}`));

  const playerUrl = story.category === "video" ? embedUrl(story.video) : "";
  if (playerUrl) {
    const player = document.createElement("iframe");
    player.className = "article-video";
    player.src = playerUrl;
    player.title = story.title;
    player.loading = "lazy";
    player.referrerPolicy = "strict-origin-when-cross-origin";
    player.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    player.allowFullscreen = true;
    article.append(player);
  } else {
    const cover = document.createElement("img");
    cover.className = "article-cover";
    cover.src = story.image;
    cover.alt = story.title;
    article.append(cover);
    if (story.category === "video") {
      article.append(makeElement("p", "video-notice", "A video for this story will be available soon."));
    }
  }

  article.append(makeElement("p", "article-excerpt", story.excerpt));
  const content = makeElement("div", "article-content");
  for (const paragraph of story.content.split(/\n\s*\n/).filter(Boolean)) {
    content.append(makeElement("p", "", paragraph));
  }
  article.append(content);
}

const slug = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "");
fetch(`/api/stories/${encodeURIComponent(slug)}`)
  .then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Travel story not found.");
    renderStory(data);
  })
  .catch((error) => {
    article.replaceChildren();
    const notFound = makeElement("section", "article-not-found");
    notFound.append(makeElement("h1", "", "Story not found"));
    notFound.append(makeElement("p", "", error.message));
    const link = makeElement("a", "", "Explore all travel stories →");
    link.href = "/#stories";
    notFound.append(link);
    article.append(notFound);
  });
