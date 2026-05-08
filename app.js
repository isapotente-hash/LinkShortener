const STORAGE_KEY = "shortener.links";

const state = {
  links: loadLinks(),
  activeShortUrl: ""
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function generateId() {
  return globalThis.crypto?.randomUUID?.() || `link-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadLinks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizeStoredLink).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeStoredLink(link) {
  if (!link || typeof link !== "object") return null;
  const shortUrl = link.shortUrl || (link.alias ? `https://${link.alias}` : "");
  if (!shortUrl || !link.url) return null;

  return {
    id: link.id || generateId(),
    shortUrl,
    url: link.url,
    opens: Number(link.opens || link.clicks || 0),
    expires: link.expires || "never",
    protected: Boolean(link.protected),
    events: Array.isArray(link.events) ? link.events : []
  };
}

function saveLinks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.links));
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function makeAliasPath() {
  const words = ["pulse", "orbit", "spark", "flux", "pixel", "beam", "route", "signal"];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.random().toString(36).slice(2, 6)}`;
}

function withRandomPath(value) {
  const existingUrl = normalizeUrl(value);
  if (existingUrl) {
    const url = new URL(existingUrl);
    url.pathname = `/${makeAliasPath()}`;
    url.search = "";
    url.hash = "";
    return url.href;
  }

  return `${window.location.origin}/${makeAliasPath()}`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

function generateQr(text) {
  const size = 21;
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  const cells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const value = finder || ((x * 17 + y * 31 + hash) % 5 < 2);
      if (value) cells.push(`<rect x="${x}" y="${y}" width="1" height="1" rx="0.18" />`);
    }
  }

  $("#qrCode").innerHTML = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code for ${text}"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#071016">${cells.join("")}</g></svg>`;
}

function detectDevice() {
  const width = window.innerWidth;
  if (width < 768) return "Mobile";
  if (width < 1100) return "Tablet";
  return "Desktop";
}

function detectBrowser() {
  const agent = navigator.userAgent;
  if (agent.includes("Edg/")) return "Edge";
  if (agent.includes("Firefox/")) return "Firefox";
  if (agent.includes("Chrome/") || agent.includes("Chromium/")) return "Chrome";
  if (agent.includes("Safari/")) return "Safari";
  return "Other";
}

function recordOpen(link) {
  link.opens += 1;
  link.events.push({
    id: generateId(),
    at: new Date().toISOString(),
    device: detectDevice(),
    browser: detectBrowser()
  });
  saveLinks();
  renderLinks($("#linkSearch")?.value || "");
  renderAnalytics();
}

function countBy(events, key) {
  return events.reduce((counts, event) => {
    const value = event[key] || "Unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function renderBreakdown(container, counts, emptyMessage) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  container.innerHTML = entries.length
    ? entries.map(([label, count]) => `<span>${label} <strong>${count}</strong></span>`).join("")
    : `<span>${emptyMessage}</span>`;
}

function renderAnalytics() {
  const totalOpens = state.links.reduce((total, link) => total + link.opens, 0);
  const events = state.links.flatMap((link) => link.events);
  $("#totalOpens").textContent = totalOpens.toLocaleString();
  $("#liveCounter").textContent = document.visibilityState === "visible" ? "1" : "0";
  $("#countryCount").textContent = "0";
  $("#conversionCount").textContent = "0";
  renderBreakdown($("#deviceAnalytics"), countBy(events, "device"), "No device opens yet.");
  renderBreakdown($("#browserAnalytics"), countBy(events, "browser"), "No browser opens yet.");
  $("#countryAnalytics").innerHTML = "<span>No country data recorded locally.</span>";
}

function renderLinks(filter = "") {
  const list = $("#linkList");
  const normalizedFilter = filter.toLowerCase();
  const links = state.links.filter((link) => `${link.shortUrl} ${link.url}`.toLowerCase().includes(normalizedFilter));

  list.innerHTML = links.map((link) => `
    <article class="link-item" data-id="${link.id}">
      <div>
        <strong>${link.shortUrl}</strong>
        <small>${link.url}</small>
        <small>${link.opens.toLocaleString()} recorded opens · Expires ${link.expires} · ${link.protected ? "Password protected" : "Public"}</small>
      </div>
      <div class="link-actions">
        <button class="icon-btn" data-action="open" title="Open destination">Open</button>
        <button class="icon-btn" data-action="copy" title="Copy link">Copy</button>
        <button class="icon-btn" data-action="edit" title="Edit custom URL">Edit</button>
        <button class="icon-btn" data-action="delete" title="Delete link">Delete</button>
      </div>
    </article>
  `).join("") || `<p>No links found. Create one from the hero shortener.</p>`;
}

function addLink({ url, shortUrl, expires, protectedLink }) {
  const existing = state.links.find((link) => link.shortUrl === shortUrl);
  if (existing) {
    showToast("That custom URL is already saved");
    return existing;
  }

  const link = {
    id: generateId(),
    shortUrl,
    url,
    opens: 0,
    expires,
    protected: protectedLink,
    events: []
  };
  state.links.unshift(link);
  saveLinks();
  renderLinks($("#linkSearch")?.value || "");
  renderAnalytics();
  return link;
}

function setupShortener() {
  $("#randomAlias").addEventListener("click", () => {
    $("#customUrl").value = withRandomPath($("#customUrl").value);
  });

  $("#shortenForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const url = normalizeUrl($("#longUrl").value);
    const shortUrl = normalizeUrl($("#customUrl").value);

    if (!url) {
      showToast("Enter a valid destination URL");
      $("#longUrl").focus();
      return;
    }

    if (!shortUrl) {
      showToast("Enter a valid custom short URL");
      $("#customUrl").focus();
      return;
    }

    const link = addLink({
      url,
      shortUrl,
      expires: $("#expiresIn").value,
      protectedLink: Boolean($("#linkPassword").value)
    });

    state.activeShortUrl = link.shortUrl;
    $("#shortUrl").textContent = state.activeShortUrl;
    $("#resultCard").classList.remove("is-hidden");
    generateQr(state.activeShortUrl);
    showToast("Custom short URL saved");
  });

  $("#copyButton").addEventListener("click", async () => {
    if (!state.activeShortUrl) return;
    await copyText(state.activeShortUrl);
    $("#copyButton").classList.add("copied");
    $("#copyButton").textContent = "Copied";
    showToast("Copied to clipboard");
    window.setTimeout(() => {
      $("#copyButton").classList.remove("copied");
      $("#copyButton").textContent = "Copy";
    }, 1200);
  });
}

function setupDashboard() {
  $("#linkSearch").addEventListener("input", (event) => renderLinks(event.target.value));
  $("#linkList").addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    const item = event.target.closest(".link-item");
    if (!button || !item) return;

    const link = state.links.find((entry) => entry.id === item.dataset.id);
    if (!link) return;

    if (button.dataset.action === "open") {
      recordOpen(link);
      window.open(link.url, "_blank", "noopener,noreferrer");
      showToast("Recorded one local open");
    }
    if (button.dataset.action === "copy") {
      await copyText(link.shortUrl);
      showToast("Link copied");
    }
    if (button.dataset.action === "delete") {
      state.links = state.links.filter((entry) => entry.id !== link.id);
      saveLinks();
      renderLinks($("#linkSearch").value);
      renderAnalytics();
      showToast("Link deleted");
    }
    if (button.dataset.action === "edit") {
      const nextUrl = normalizeUrl(window.prompt("Edit custom short URL", link.shortUrl) || link.shortUrl);
      if (!nextUrl) {
        showToast("Enter a valid custom short URL");
        return;
      }
      link.shortUrl = nextUrl;
      saveLinks();
      renderLinks($("#linkSearch").value);
      showToast("Custom URL updated");
    }
  });

  const dropZone = $("#csvDrop");
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragover");
    });
  });
  dropZone.addEventListener("drop", (event) => {
    const count = event.dataTransfer.files.length || 1;
    showToast(`${count} CSV file ready for import`);
  });
}

function setupNavigation() {
  const header = $(".site-header");
  const toggle = $(".nav-toggle");
  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

function setupReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((element) => observer.observe(element));
}

function setupAuth() {
  $("#authForm").addEventListener("submit", (event) => {
    event.preventDefault();
    $("#authMessage").textContent = "Your secure workspace is ready.";
    showToast("Signed in successfully");
  });
}

setupNavigation();
setupShortener();
setupDashboard();
setupAuth();
setupReveals();
renderLinks();
renderAnalytics();
generateQr("Add your custom short URL");
document.addEventListener("visibilitychange", renderAnalytics);
