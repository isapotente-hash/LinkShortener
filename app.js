const STORAGE_KEY = "novalink.links";
function generateId() {
  return crypto.randomUUID?.() || `link-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const sampleLinks = [
  { id: generateId(), alias: "launch", url: "https://novalink.app/product-launch", clicks: 1842, expires: "30 days", protected: true },
  { id: generateId(), alias: "study", url: "https://example.com/research/campaign/study-guide", clicks: 927, expires: "Never", protected: false },
  { id: generateId(), alias: "api-beta", url: "https://docs.novalink.app/api/beta", clicks: 411, expires: "7 days", protected: false }
];

const state = {
  links: loadLinks(),
  activeShortUrl: "novalink.app/launch"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadLinks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : sampleLinks;
}

function saveLinks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.links));
}

function normalizeAlias(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function makeAlias() {
  const words = ["nova", "pulse", "orbit", "spark", "flux", "pixel", "beam", "route"];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.random().toString(36).slice(2, 6)}`;
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

function renderLinks(filter = "") {
  const list = $("#linkList");
  const normalizedFilter = filter.toLowerCase();
  const links = state.links.filter((link) => `${link.alias} ${link.url}`.toLowerCase().includes(normalizedFilter));

  list.innerHTML = links.map((link) => `
    <article class="link-item" data-id="${link.id}">
      <div>
        <strong>novalink.app/${link.alias}</strong>
        <small>${link.url}</small>
        <small>${link.clicks.toLocaleString()} clicks · Expires ${link.expires} · ${link.protected ? "Password protected" : "Public"}</small>
      </div>
      <div class="link-actions">
        <button class="icon-btn" data-action="copy" title="Copy link">Copy</button>
        <button class="icon-btn" data-action="edit" title="Edit alias">Edit</button>
        <button class="icon-btn" data-action="delete" title="Delete link">Delete</button>
      </div>
    </article>
  `).join("") || `<p>No links found. Create one from the hero shortener.</p>`;
}

function addLink({ url, alias, expires, protectedLink }) {
  const uniqueAlias = normalizeAlias(alias) || makeAlias();
  const existing = state.links.find((link) => link.alias === uniqueAlias);
  const finalAlias = existing ? `${uniqueAlias}-${Math.random().toString(36).slice(2, 5)}` : uniqueAlias;
  const link = {
    id: generateId(),
    alias: finalAlias,
    url,
    clicks: Math.floor(Math.random() * 900) + 12,
    expires,
    protected: protectedLink
  };
  state.links.unshift(link);
  saveLinks();
  renderLinks($("#linkSearch")?.value || "");
  return link;
}

function animateCounters() {
  $$(".counter").forEach((counter) => {
    const target = Number(counter.dataset.target);
    const duration = 1200;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      counter.textContent = Math.floor(target * progress).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function setupShortener() {
  $("#randomAlias").addEventListener("click", () => {
    $("#customAlias").value = makeAlias();
  });

  $("#shortenForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const url = $("#longUrl").value.trim();
    const link = addLink({
      url,
      alias: $("#customAlias").value,
      expires: $("#expiresIn").value,
      protectedLink: Boolean($("#linkPassword").value)
    });

    state.activeShortUrl = `novalink.app/${link.alias}`;
    $("#shortUrl").textContent = state.activeShortUrl;
    $("#resultCard").classList.remove("is-hidden");
    generateQr(state.activeShortUrl);
    showToast("Short link generated");
  });

  $("#copyButton").addEventListener("click", async () => {
    await copyText(`https://${state.activeShortUrl}`);
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
    if (button.dataset.action === "copy") {
      await copyText(`https://novalink.app/${link.alias}`);
      showToast("Link copied");
    }
    if (button.dataset.action === "delete") {
      state.links = state.links.filter((entry) => entry.id !== link.id);
      saveLinks();
      renderLinks($("#linkSearch").value);
      showToast("Link deleted");
    }
    if (button.dataset.action === "edit") {
      const nextAlias = normalizeAlias(window.prompt("Edit alias", link.alias) || link.alias);
      link.alias = nextAlias || link.alias;
      saveLinks();
      renderLinks($("#linkSearch").value);
      showToast("Alias updated");
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
    showToast(`${count} CSV file queued for bulk shortening`);
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
    $("#authMessage").textContent = "Welcome to NovaLink. Your secure workspace is ready.";
    showToast("Signed in successfully");
  });
}

function setupLiveMetrics() {
  window.setInterval(() => {
    const liveCounter = $("#liveCounter");
    const next = Number(liveCounter.textContent) + Math.floor(Math.random() * 7) - 2;
    liveCounter.textContent = Math.max(32, next).toString();
  }, 1800);
}

setupNavigation();
setupShortener();
setupDashboard();
setupAuth();
setupReveals();
setupLiveMetrics();
renderLinks();
generateQr(state.activeShortUrl);
animateCounters();
