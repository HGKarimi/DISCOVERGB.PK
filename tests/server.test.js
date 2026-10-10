"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const PASSWORD = "GB-travel-test-secret-2026";
const TEMP_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "discovergb-test-"));
let serverProcess;
let baseUrl;
let cookie;

async function getOpenPort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => socket.listen(0, "127.0.0.1", resolve).once("error", reject));
  const port = socket.address().port;
  await new Promise((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(process) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error("Development server stopped before becoming ready.");
    try {
      const response = await fetch(`${baseUrl}/api/stories`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Development server did not start within ten seconds.");
}

async function apiRequest(route, { method = "GET", body, authenticated = false } = {}) {
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      Origin: baseUrl,
      ...(authenticated ? { Cookie: cookie } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

before(async () => {
  const port = await getOpenPort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      ADMIN_PASSWORD: PASSWORD,
      DISCOVERGB_DATA_DIR: TEMP_DATA,
      HOST: "127.0.0.1",
      PORT: String(port),
    },
    stdio: "ignore",
  });
  await waitForServer(serverProcess);
});

after(() => {
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill();
  fs.rmSync(TEMP_DATA, { recursive: true, force: true });
});

test("requires authentication before showing private stories", async () => {
  const response = await apiRequest("/api/admin/stories");
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.match(body.error, /sign in/i);
});

test("serves a separate page for every main navigation destination", async () => {
  for (const route of ["/", "/destinations", "/guides", "/videos", "/about"]) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 200, `${route} should load`);
    assert.match(response.headers.get("content-type"), /text\/html/);
  }
  for (const asset of ["/page.js", "/page.css"]) {
    const response = await fetch(`${baseUrl}${asset}`);
    assert.equal(response.status, 200, `${asset} should load`);
  }
});

test("rejects login requests from another origin", async () => {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { Origin: "https://attacker.example", "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  assert.equal(response.status, 403);
});

test("signs in and creates, publishes, updates, and deletes a story", async () => {
  const login = await apiRequest("/api/admin/login", {
    method: "POST",
    body: { password: PASSWORD },
  });
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];

  const draft = {
    title: "Hidden Valley Notes",
    category: "guide",
    location: "Upper Hunza",
    readTime: "4 min read",
    excerpt: "An original guide to a quiet corner of the north.",
    image: "https://images.example.test/valley.jpg",
    video: "",
    content: "A story about discovery.\n\nA second paragraph.",
    published: false,
  };
  const create = await apiRequest("/api/admin/stories", { method: "POST", body: draft, authenticated: true });
  assert.equal(create.status, 201);
  const created = await create.json();
  assert.equal(created.slug, "hidden-valley-notes");
  assert.equal((await (await apiRequest("/api/stories")).json()).some((story) => story.slug === created.slug), false);

  const updated = await apiRequest(`/api/admin/stories/${created.id}`, {
    method: "PUT",
    authenticated: true,
    body: { ...draft, published: true },
  });
  assert.equal(updated.status, 200);
  const publicStory = await fetch(`${baseUrl}/api/stories/${created.slug}`);
  assert.equal(publicStory.status, 200);
  assert.match((await publicStory.json()).content, /second paragraph/i);

  const page = await fetch(`${baseUrl}/story/${created.slug}`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /story\.js/);
  assert.equal((await fetch(`${baseUrl}/story.js`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/story.css`)).status, 200);

  const remove = await apiRequest(`/api/admin/stories/${created.id}`, { method: "DELETE", authenticated: true });
  assert.equal(remove.status, 200);
  assert.equal((await fetch(`${baseUrl}/api/stories/${created.slug}`)).status, 404);
});

test("uploads and serves a validated cover image", async () => {
  const png = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1,
    8, 2, 0, 0, 0, 144, 119, 83, 222,
  ]);
  const upload = await apiRequest("/api/admin/uploads", {
    method: "POST",
    authenticated: true,
    body: { dataUrl: `data:image/png;base64,${png.toString("base64")}` },
  });
  assert.equal(upload.status, 201);
  const { image } = await upload.json();
  assert.match(image, /^\/media\/[a-f0-9-]+\.png$/);
  const servedImage = await fetch(`${baseUrl}${image}`);
  assert.equal(servedImage.status, 200);
  assert.equal(servedImage.headers.get("content-type"), "image/png");

  const storyResponse = await apiRequest("/api/admin/stories", {
    method: "POST",
    authenticated: true,
    body: {
      title: "Uploaded Cover Test",
      category: "guide",
      location: "Gilgit-Baltistan",
      readTime: "2 min read",
      excerpt: "Verify an uploaded cover can be used in a public story.",
      image,
      video: "",
      content: "The dashboard can use uploaded cover images.",
      published: true,
    },
  });
  assert.equal(storyResponse.status, 201);
  assert.equal((await storyResponse.json()).image, image);
});

test("rejects duplicate slugs and untrusted video links", async () => {
  const stories = await (await apiRequest("/api/admin/stories", { authenticated: true })).json();
  const existing = stories[0];
  const duplicate = await apiRequest("/api/admin/stories", {
    method: "POST",
    authenticated: true,
    body: {
      title: "Another story",
      slug: existing.slug,
      category: "guide",
      location: "Hunza",
      readTime: "5 min read",
      excerpt: "Travel story.",
      image: "https://images.example.test/cover.jpg",
      video: "",
      content: "Travel story body.",
      published: true,
    },
  });
  assert.equal(duplicate.status, 400);
  assert.match((await duplicate.json()).error, /slug is already/);

  const invalid = await apiRequest("/api/admin/stories", {
    method: "POST",
    body: {
      title: "Another story",
      category: "video",
      location: "Hunza",
      readTime: "5 min watch",
      excerpt: "Travel story.",
      image: "https://images.example.test/cover.jpg",
      video: "https://example.invalid/video",
      content: "Travel story body.",
      published: true,
    },
  });
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /YouTube or Vimeo/);
});
