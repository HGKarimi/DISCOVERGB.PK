const loginPanel = document.querySelector("#login-panel");
const loginForm = document.querySelector("#login-form");
const dashboard = document.querySelector("#dashboard");
const storyForm = document.querySelector("#story-form");
const formMessage = document.querySelector("#form-message");
const listMessage = document.querySelector("#list-message");
const storyList = document.querySelector("#story-list");
const totalCount = document.querySelector("#total-count");
const formHeading = document.querySelector("#form-heading");
const cancelEdit = document.querySelector("#cancel-edit");
const imageFile = document.querySelector("#image-file");
const imagePreview = document.querySelector("#image-preview");
let editingId = null;
let stories = [];

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderStories() {
  storyList.replaceChildren();
  totalCount.textContent = String(stories.length);

  if (stories.length === 0) {
    storyList.append(createElement("p", "empty-list", "No stories yet. Add your first story using the form."));
    return;
  }

  for (const story of stories) {
    const row = createElement("article", "managed-story");
    const image = document.createElement("img");
    image.src = story.image;
    image.alt = "";
    image.loading = "lazy";
    row.append(image);

    const copy = createElement("div", "managed-story-copy");
    copy.append(createElement("h3", "", story.title));
    copy.append(createElement("p", "managed-meta", `${story.location} · ${story.category === "video" ? "Travel video" : "Photo guide"}`));
    copy.append(createElement("span", `status-badge${story.published ? "" : " is-draft"}`, story.published ? "Published" : "Draft"));

    const actions = createElement("div", "story-actions");
    const editButton = createElement("button", "", "Edit");
    editButton.type = "button";
    editButton.addEventListener("click", () => editStory(story));
    actions.append(editButton);

    if (story.published) {
      const viewLink = createElement("a", "", "View");
      viewLink.href = `/story/${encodeURIComponent(story.slug)}`;
      viewLink.target = "_blank";
      viewLink.rel = "noreferrer";
      actions.append(viewLink);
    }

    const deleteButton = createElement("button", "delete-action", "Delete");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteStory(story));
    actions.append(deleteButton);
    copy.append(actions);
    row.append(copy);
    storyList.append(row);
  }
}

async function loadStories() {
  showMessage(listMessage, "");
  try {
    stories = await api("/api/admin/stories");
    renderStories();
  } catch (error) {
    showMessage(listMessage, error.message, true);
  }
}

function resetEditor() {
  editingId = null;
  storyForm.reset();
  storyForm.elements.published.checked = true;
  storyForm.elements.image.required = true;
  storyForm.elements.video.required = false;
  imagePreview.hidden = true;
  imagePreview.removeAttribute("src");
  formHeading.textContent = "New story";
  cancelEdit.hidden = true;
  showMessage(formMessage, "");
}

function editStory(story) {
  editingId = story.id;
  for (const field of ["title", "slug", "category", "location", "excerpt", "image", "video", "readTime", "content"]) {
    storyForm.elements[field].value = story[field] || "";
  }
  storyForm.elements.published.checked = story.published;
  storyForm.elements.image.required = !story.image;
  storyForm.elements.video.required = story.category === "video";
  imageFile.value = "";
  imagePreview.src = story.image;
  imagePreview.hidden = false;
  formHeading.textContent = "Edit story";
  cancelEdit.hidden = false;
  showMessage(formMessage, "");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("The image could not be read.")));
    reader.readAsDataURL(file);
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button");
  button.disabled = true;
  showMessage(formMessage, "");
  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: loginForm.elements.password.value }),
    });
    loginPanel.hidden = true;
    dashboard.hidden = false;
    await loadStories();
  } catch (error) {
    showMessage(formMessage, error.message, true);
  } finally {
    button.disabled = false;
    loginForm.elements.password.value = "";
  }
});

storyForm.elements.category.addEventListener("change", () => {
  storyForm.elements.video.required = storyForm.elements.category.value === "video";
});

imageFile.addEventListener("change", () => {
  const file = imageFile.files[0];
  if (!file) {
    storyForm.elements.image.required = true;
    imagePreview.hidden = true;
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
    showMessage(formMessage, "Choose a JPG, PNG, or WebP image smaller than 8 MB.", true);
    imageFile.value = "";
    storyForm.elements.image.required = true;
    return;
  }
  storyForm.elements.image.required = false;
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.hidden = false;
  showMessage(formMessage, "");
});

storyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = storyForm.querySelector(".save-button");
  button.disabled = true;
  showMessage(formMessage, "Saving story…");
  try {
    let image = storyForm.elements.image.value.trim();
    const selectedFile = imageFile.files[0];
    if (selectedFile) {
      const dataUrl = await readFileAsDataUrl(selectedFile);
      const uploaded = await api("/api/admin/uploads", {
        method: "POST",
        body: JSON.stringify({ dataUrl }),
      });
      image = uploaded.image;
    }

    const story = {
      title: storyForm.elements.title.value,
      slug: storyForm.elements.slug.value,
      category: storyForm.elements.category.value,
      location: storyForm.elements.location.value,
      excerpt: storyForm.elements.excerpt.value,
      image,
      video: storyForm.elements.video.value,
      readTime: storyForm.elements.readTime.value,
      content: storyForm.elements.content.value,
      published: storyForm.elements.published.checked,
    };
    const isEditing = Boolean(editingId);
    await api(isEditing ? `/api/admin/stories/${encodeURIComponent(editingId)}` : "/api/admin/stories", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(story),
    });
    resetEditor();
    await loadStories();
    showMessage(formMessage, isEditing ? "Story updated successfully." : "Story saved successfully.");
  } catch (error) {
    showMessage(formMessage, error.message, true);
  } finally {
    button.disabled = false;
  }
});

cancelEdit.addEventListener("click", resetEditor);

async function deleteStory(story) {
  if (!window.confirm(`Delete "${story.title}"? This cannot be undone.`)) return;
  showMessage(listMessage, "Deleting story…");
  try {
    await api(`/api/admin/stories/${encodeURIComponent(story.id)}`, { method: "DELETE" });
    if (editingId === story.id) resetEditor();
    await loadStories();
    showMessage(listMessage, "Story deleted.");
  } catch (error) {
    showMessage(listMessage, error.message, true);
  }
}

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await api("/api/admin/logout", { method: "POST", body: "{}" });
    window.location.reload();
  } catch (error) {
    showMessage(listMessage, error.message, true);
  }
});

api("/api/admin/session")
  .then((session) => {
    if (session.authenticated) {
      loginPanel.hidden = true;
      dashboard.hidden = false;
      return loadStories();
    }
    return undefined;
  })
  .catch((error) => showMessage(formMessage, error.message, true));
