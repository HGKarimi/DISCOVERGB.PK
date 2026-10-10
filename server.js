"use strict";

const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

loadEnvironment();

const ROOT = __dirname;
const DATA_DIRECTORY = process.env.DISCOVERGB_DATA_DIR
  ? path.resolve(process.env.DISCOVERGB_DATA_DIR)
  : path.join(ROOT, "data");
const UPLOAD_DIRECTORY = path.join(DATA_DIRECTORY, "uploads");
const STORY_FILE = path.join(DATA_DIRECTORY, "stories.json");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const SESSION_DURATION = 12 * 60 * 60 * 1000;
const MAX_JSON_BYTES = 12 * 1024 * 1024;
const SESSION_COOKIE = "discovergb_session";
const sessions = new Map();
const loginAttempts = new Map();

const seedStories = [
  {
    title: "Hunza Valley: A Journey Through the Mountains",
    slug: "hunza-valley-journey",
    category: "video",
    location: "Hunza Valley",
    readTime: "8 min watch",
    excerpt: "Come along for the road, the views, and the small discoveries that make Hunza unforgettable.",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=850&q=85",
    video: "",
    content: "A journey through Hunza Valley, its mountain roads, and the places that make this corner of the north so memorable.\n\nReplace this sample story with your own travel notes, visitor information, and the places you recommend.",
    published: true,
  },
  {
    title: "Attabad Lake: What to See and Do",
    slug: "attabad-lake-guide",
    category: "guide",
    location: "Upper Hunza",
    readTime: "6 min read",
    excerpt: "Plan a stop at one of the north’s most famous lakes and find out what’s around it.",
    image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=850&q=85",
    video: "",
    content: "Plan a visit to Attabad Lake and discover what is nearby.\n\nReplace this sample guide with practical travel details, local recommendations, and your own photographs.",
    published: true,
  },
  {
    title: "The Road to Skardu: Following the Indus",
    slug: "road-to-skardu",
    category: "video",
    location: "Baltistan",
    readTime: "11 min watch",
    excerpt: "A road-trip story through changing landscapes and into the heart of Baltistan.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=850&q=85",
    video: "",
    content: "Follow the road beside the Indus as it winds into Baltistan.\n\nReplace this sample story with your own travel video, route information, and experiences.",
    published: true,
  },
  {
    title: "Passu Cones and the Villages of Upper Hunza",
    slug: "passu-cones-upper-hunza",
    category: "guide",
    location: "Upper Hunza",
    readTime: "5 min read",
    excerpt: "Look beyond the famous peaks and discover the small communities nearby.",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=850&q=85",
    video: "",
    content: "Discover the villages and landscapes around Passu and Upper Hunza.\n\nReplace this sample guide with local insights and up-to-date visitor information.",
    published: true,
  },
  {
    title: "A Day in a Hidden Mountain Valley",
    slug: "hidden-mountain-valley",
    category: "video",
    location: "Gilgit-Baltistan",
    readTime: "9 min watch",
    excerpt: "Step away from the main road and discover a quieter side of the north.",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=850&q=85",
    video: "",
    content: "Take the road less travelled and spend a day in a quieter mountain valley.\n\nReplace this sample story with your video and first-hand recommendations.",
    published: true,
  },
  {
    title: "Deosai Plains: A First-Time Visitor's Guide",
    slug: "deosai-plains-visitor-guide",
    category: "guide",
    location: "Skardu Region",
    readTime: "7 min read",
    excerpt: "What to know before setting out for the high plains, especially if it’s your first visit.",
    image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=850&q=85",
    video: "",
    content: "Prepare for your journey to Deosai National Park and its wide-open landscapes.\n\nReplace this sample guide with current route details, seasonal advice, and your own observations.",
    published: true,
  },
].map((story) => ({
  ...story,
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const pageRoutes = new Set(["/destinations", "/guides", "/videos", "/about"]);

function loadEnvironment() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || Object.hasOwn(process.env, match[1])) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
}

function readStories() {
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
  if (!fs.existsSync(STORY_FILE)) {
    writeStories(seedStories);
  }
  const stories = JSON.parse(fs.readFileSync(STORY_FILE, "utf8"));
  if (!Array.isArray(stories)) throw new Error("data/stories.json must contain an array.");
  return stories;
}

function writeStories(stories) {
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
  const temporaryFile = `${STORY_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(stories, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporaryFile, STORY_FILE);
}

function sendJson(response, status, data, headers = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(JSON.stringify(data));
}

function sendError(response, status, message) {
  sendJson(response, status, { error: message });
}

function getCookies(request) {
  return Object.fromEntries(
    (request.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim().split(/=(.*)/s, 2))
      .filter(([name, value]) => name && value !== undefined),
  );
}

function getSession(request) {
  const token = getCookies(request)[SESSION_COOKIE];
  const session = token && sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_DURATION;
  return token;
}

function requireAdmin(request, response) {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    sendError(response, 503, "Set ADMIN_PASSWORD to a private password of at least 12 characters before using the admin dashboard.");
    return false;
  }
  if (!getSession(request)) {
    sendError(response, 401, "Please sign in to manage stories.");
    return false;
  }
  return true;
}

function validWriteOrigin(request, response) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) {
    sendError(response, 403, "A same-origin request is required.");
    return false;
  }
  try {
    if (new URL(origin).host !== host) {
      sendError(response, 403, "Cross-origin requests are not allowed.");
      return false;
    }
  } catch {
    sendError(response, 403, "The request origin is invalid.");
    return false;
  }
  return true;
}

async function readJson(request, response) {
  const contentType = request.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    sendError(response, 415, "Send data using application/json.");
    return null;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) {
      sendError(response, 413, "The request is too large.");
      return null;
    }
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      sendError(response, 400, "The request body must be a JSON object.");
      return null;
    }
    return body;
  } catch {
    sendError(response, 400, "The request body is not valid JSON.");
    return null;
  }
}

function cleanText(value, name, maxLength, { required = false } = {}) {
  if (typeof value !== "string") throw new Error(`${name} must be text.`);
  const text = value.trim();
  if (required && !text) throw new Error(`${name} is required.`);
  if (text.length > maxLength) throw new Error(`${name} must be ${maxLength} characters or fewer.`);
  return text;
}

function validHttpUrl(value, name, { optional = false, allowedHosts = null, image = false } = {}) {
  const text = cleanText(value || "", name, 2048);
  if (!text && optional) return "";
  if (image && /^\/media\/[a-f0-9-]+\.(?:jpe?g|png|webp)$/i.test(text)) return text;
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== "https:") throw new Error(`${name} must use HTTPS.`);
  if (allowedHosts && !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    throw new Error(`${name} must link to YouTube or Vimeo.`);
  }
  return url.href;
}

function makeStory(input, existingStories, previous = null) {
  const title = cleanText(input.title, "Title", 140, { required: true });
  const slug = (cleanText(input.slug || "", "URL slug", 100) || title)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new Error("Title must contain letters or numbers.");
  if (existingStories.some((story) => story.slug === slug && story.id !== previous?.id)) {
    throw new Error("That URL slug is already in use.");
  }

  const category = input.category;
  if (!["video", "guide"].includes(category)) throw new Error("Choose Travel video or Photo guide.");
  const youtubeOrVimeo = ["youtube.com", "youtu.be", "vimeo.com"];
  const video = validHttpUrl(input.video || "", "Video URL", {
    optional: true,
    allowedHosts: youtubeOrVimeo,
  });
  if (video && !getVideoEmbedUrl(video)) {
    throw new Error("Use a direct YouTube video or Vimeo video URL.");
  }

  if (category === "video" && !video) {
    throw new Error("Add a YouTube or Vimeo URL for a travel video.");
  }

  const published = input.published === true;
  return {
    id: previous?.id || crypto.randomUUID(),
    title,
    slug,
    category,
    location: cleanText(input.location, "Location", 80, { required: true }),
    readTime: cleanText(input.readTime, "Reading or watch time", 40, { required: true }),
    excerpt: cleanText(input.excerpt, "Summary", 300, { required: true }),
    image: validHttpUrl(input.image, "Cover image URL", { image: true }),
    video,
    content: cleanText(input.content, "Story", 20000, { required: true }),
    published,
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function constantTimePasswordMatch(input) {
  const configured = Buffer.from(crypto.createHash("sha256").update(process.env.ADMIN_PASSWORD).digest());
  const submitted = Buffer.from(crypto.createHash("sha256").update(input).digest());
  return crypto.timingSafeEqual(configured, submitted);
}

function getVideoEmbedUrl(input) {
  if (!input) return "";
  const url = new URL(input);
  if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
    const videoId = url.pathname.slice(1).split("/")[0];
    return /^[A-Za-z0-9_-]{6,20}$/.test(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : "";
  }
  if (url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com")) {
    const videoId = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{6,20})/)?.[1];
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : "";
  }
  if (url.hostname === "vimeo.com" || url.hostname.endsWith(".vimeo.com")) {
    const videoId = url.pathname.match(/\/(\d{1,15})\/?$/)?.[1];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : "";
  }
  return "";
}

function staticFile(request, response, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    sendError(response, 400, "The requested path is invalid.");
    return;
  }

  let filename;
  if (decoded === "/") filename = "index.html";
  else if (decoded === "/admin") filename = "admin.html";
  else if (pageRoutes.has(decoded.replace(/\/$/, ""))) filename = "page.html";
  else if (/^\/story\/[a-z0-9-]+\/?$/.test(decoded)) filename = "story.html";
  else if (/^\/media\/[a-f0-9-]+\.(?:jpe?g|png|webp)$/i.test(decoded)) {
    filename = path.join(UPLOAD_DIRECTORY, path.basename(decoded));
  } else if (/^\/(?:index\.html|styles\.css|script\.js|admin\.html|admin\.css|admin\.js|story\.html|story\.css|story\.js|page\.html|page\.css|page\.js)$/.test(decoded)) {
    filename = path.join(ROOT, decoded.slice(1));
  }

  if (!filename) {
    sendError(response, 404, "Page not found.");
    return;
  }

  const fullPath = path.resolve(filename);
  const allowedRoots = [ROOT, UPLOAD_DIRECTORY];
  if (!allowedRoots.some((root) => fullPath.startsWith(`${path.resolve(root)}${path.sep}`))) {
    sendError(response, 403, "Access denied.");
    return;
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    sendError(response, 404, "File not found.");
    return;
  }
  const ext = path.extname(fullPath).toLowerCase();
  response.writeHead(200, {
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  if (request.method === "HEAD") response.end();
  else fs.createReadStream(fullPath).pipe(response);
}

async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const { pathname } = requestUrl;
  const method = request.method;

  if (pathname.startsWith("/api/")) {
    if (method === "GET" && pathname === "/api/stories") {
      return sendJson(response, 200, readStories().filter((story) => story.published).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    }
    if (method === "GET" && pathname.startsWith("/api/stories/")) {
      const slug = pathname.slice("/api/stories/".length);
      const story = readStories().find((item) => item.slug === slug && item.published);
      return story ? sendJson(response, 200, story) : sendError(response, 404, "Travel story not found.");
    }
    if (method === "POST" && pathname === "/api/admin/login") {
      if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
        return sendError(response, 503, "Set ADMIN_PASSWORD to a private password of at least 12 characters before signing in.");
      }
      const ip = request.socket.remoteAddress || "unknown";
      const now = Date.now();
      const attempts = (loginAttempts.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000);
      if (attempts.length >= 8) return sendError(response, 429, "Too many sign-in attempts. Wait 15 minutes and try again.");
      if (!validWriteOrigin(request, response)) return;
      const body = await readJson(request, response);
      if (!body) return;
      if (typeof body.password !== "string" || body.password.length > 256 || !constantTimePasswordMatch(body.password)) {
        attempts.push(now);
        loginAttempts.set(ip, attempts);
        return sendError(response, 401, "Incorrect admin password.");
      }
      loginAttempts.delete(ip);
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, { expiresAt: now + SESSION_DURATION });
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      return sendJson(response, 200, { ok: true }, {
        "Set-Cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}${secure}`,
      });
    }
    if (method === "GET" && pathname === "/api/admin/session") {
      return sendJson(response, 200, { authenticated: Boolean(getSession(request)) });
    }
    if (method === "POST" && pathname === "/api/admin/logout") {
      if (!validWriteOrigin(request, response)) return;
      const token = getCookies(request)[SESSION_COOKIE];
      if (token) sessions.delete(token);
      return sendJson(response, 200, { ok: true }, {
        "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      });
    }
    if (pathname === "/api/admin/stories" && method === "GET") {
      if (!requireAdmin(request, response)) return;
      return sendJson(response, 200, readStories().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    }
    if (pathname === "/api/admin/stories" && method === "POST") {
      if (!requireAdmin(request, response) || !validWriteOrigin(request, response)) return;
      const body = await readJson(request, response);
      if (!body) return;
      const stories = readStories();
      try {
        const story = makeStory(body, stories);
        stories.push(story);
        writeStories(stories);
        return sendJson(response, 201, story);
      } catch (error) {
        return sendError(response, 400, error.message);
      }
    }
    if (pathname.startsWith("/api/admin/stories/")) {
      if (!requireAdmin(request, response) || !validWriteOrigin(request, response)) return;
      const id = pathname.slice("/api/admin/stories/".length);
      const stories = readStories();
      const index = stories.findIndex((story) => story.id === id);
      if (index < 0) return sendError(response, 404, "Travel story not found.");
      if (method === "DELETE") {
        const [removed] = stories.splice(index, 1);
        writeStories(stories);
        return sendJson(response, 200, { ok: true, removed: removed.title });
      }
      if (method === "PUT") {
        const body = await readJson(request, response);
        if (!body) return;
        try {
          const updated = makeStory(body, stories, stories[index]);
          stories[index] = updated;
          writeStories(stories);
          return sendJson(response, 200, updated);
        } catch (error) {
          return sendError(response, 400, error.message);
        }
      }
      return sendError(response, 405, "Method not allowed.");
    }
    if (pathname === "/api/admin/uploads" && method === "POST") {
      if (!requireAdmin(request, response) || !validWriteOrigin(request, response)) return;
      const body = await readJson(request, response);
      if (!body) return;
      if (typeof body.dataUrl !== "string" || body.dataUrl.length > 12 * 1024 * 1024) {
        return sendError(response, 400, "Choose an image smaller than 8 MB.");
      }
      const match = body.dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
      if (!match) return sendError(response, 400, "Upload a JPG, PNG, or WebP image.");
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length > 8 * 1024 * 1024) return sendError(response, 413, "Choose an image smaller than 8 MB.");
      const validSignature = {
        jpeg: bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
        png: bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        webp: bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP",
      }[match[1]];
      if (!validSignature) return sendError(response, 400, "The uploaded image is invalid or its file type does not match.");
      const ext = match[1] === "jpeg" ? ".jpg" : `.${match[1]}`;
      fs.mkdirSync(UPLOAD_DIRECTORY, { recursive: true });
      const filename = `${crypto.randomUUID()}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIRECTORY, filename), bytes, { flag: "wx", mode: 0o644 });
      return sendJson(response, 201, { image: `/media/${filename}` });
    }
    return sendError(response, 404, "API endpoint not found.");
  }

  if (method === "GET" || method === "HEAD") return staticFile(request, response, pathname);
  return sendError(response, 405, "Method not allowed.");
}

try {
  readStories();
} catch (error) {
  console.error("Unable to initialize story storage:", error.message);
  process.exitCode = 1;
}

if (process.exitCode !== 1) {
  const server = http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      console.error("Request failed:", error.message);
      if (!response.headersSent) sendError(response, 500, "The server could not complete the request.");
      else response.destroy();
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`DiscoverGB.pk is running at http://${HOST}:${PORT}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.warn("Admin login is disabled. Copy .env.example to .env and set a strong ADMIN_PASSWORD.");
    }
  });
}
