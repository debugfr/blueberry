const form = document.querySelector("#address-form");
const addressInput = document.querySelector("#address-input");
const tabList = document.querySelector("#tab-list");
const pageHost = document.querySelector("#page-host");
const pageStatus = document.querySelector("#page-status");
const backButton = document.querySelector("#back-button");
const forwardButton = document.querySelector("#forward-button");
const reloadButton = document.querySelector("#reload-button");
const bookmarkButton = document.querySelector("#bookmark-button");
const bookmarkBar = document.querySelector("#bookmark-bar");
const fullscreenButton = document.querySelector("#fullscreen-button");
const privateModeButton = document.querySelector("#private-mode-button");
const privateNotice = document.querySelector("#private-notice");
const menuToggle = document.querySelector("#menu-toggle");
const browserMenu = document.querySelector("#browser-menu");
const historyView = document.querySelector("#history-view");
const historyViewList = document.querySelector("#history-view-list");
const historyViewStatus = document.querySelector("#history-view-status");
const historySearch = document.querySelector("#history-search");

const bookmarksKey = "blueberryub.bookmarks";
const historyPreferenceKey = "blueberryub.history-enabled";
const guestHistoryKey = "blueberryub.guest-history";
const sessionTabsKey = "blueberryub.session-tabs";
const recentlyClosedKey = "blueberryub.recently-closed";
const quickLinks = [
  { label: "BlueberryUB", url: "/", icon: "home", color: "sky", local: true },
  { label: "Google", url: "https://www.google.com", icon: "search", color: "sun" },
  { label: "YouTube", url: "https://www.youtube.com", icon: "play", color: "coral" },
  { label: "Wikipedia", url: "https://www.wikipedia.org", icon: "book", color: "mint" },
  { label: "CrazyGames", url: "https://www.crazygames.com", icon: "game", color: "violet" },
];

let controllerPromise;
let privateControllerPromise;
let tabs = [];
let activeTab;
let nextTabId = 1;
let restoringSession = false;
let historyClient;
let historyUser = null;
let historyEnabled = false;
let historyReady = Promise.resolve();
let privateMode = new URLSearchParams(window.location.search).get("private") === "1";
let recentlyClosedTabs = readSessionValue(recentlyClosedKey, []);

async function syncHistoryUser(user) {
  historyUser = user ?? null;
  historyEnabled = false;
  if (!historyClient || !historyUser) return;

  const { data, error } = await historyClient
    .from("profiles")
    .select("history_enabled")
    .eq("user_id", historyUser.id)
    .maybeSingle();
  historyEnabled = !error && data?.history_enabled !== false && localStorage.getItem(historyPreferenceKey) !== "false";
}

async function initializeHistory() {
  const config = window.BLUEBERRY_SUPABASE_CONFIG;
  if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) return;

  historyClient = window.supabase.createClient(config.url, config.publishableKey);
  const { data } = await historyClient.auth.getSession();
  await syncHistoryUser(data.session?.user);
  historyClient.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => void syncHistoryUser(session?.user), 0);
  });
}

function readSessionValue(key, fallback) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeSessionValue(key, value) {
  if (privateMode) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    pageStatus.textContent = "Could not save this browser session";
  }
}

function persistTabSession() {
  if (privateMode || restoringSession) return;
  const savedTabs = tabs.filter((tab) => tab.url).slice(-20).map((tab) => ({
    url: tab.url,
    name: tab.name,
  }));
  writeSessionValue(sessionTabsKey, {
    tabs: savedTabs,
    activeUrl: activeTab?.url || "",
  });
}

async function recordVisit(tab, value) {
  await historyReady;
  if (privateMode || tab.isPrivate || localStorage.getItem(historyPreferenceKey) === "false") return;
  let url;
  try {
    url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
  } catch {
    return;
  }

  const canonicalUrl = url.href;
  const now = Date.now();
  if (tab.lastHistoryUrl === canonicalUrl && now - tab.lastHistoryAt < 15000) return;
  tab.lastHistoryUrl = canonicalUrl;
  tab.lastHistoryAt = now;

  if (historyUser && historyClient) {
    if (!historyEnabled) return;
    const { error } = await historyClient.from("browser_history").insert({
      user_id: historyUser.id,
      url: canonicalUrl,
      title: tab.name || url.hostname,
    });
    if (error && error.code !== "PGRST205" && error.code !== "42P01") console.warn("Could not save browser history.");
  } else {
    const entries = readSessionValue(guestHistoryKey, []);
    entries.unshift({ url: canonicalUrl, title: tab.name || url.hostname, visited_at: new Date().toISOString() });
    const unique = entries.filter((entry, index) => entries.findIndex((candidate) => candidate.url === entry.url) === index).slice(0, 100);
    writeSessionValue(guestHistoryKey, unique);
  }
}

window.addEventListener("storage", (event) => {
  if (event.key === historyPreferenceKey) {
    historyEnabled = Boolean(historyUser) && event.newValue !== "false";
  }
});

function makeIcon(name, className = "icon") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `/icons.svg#icon-${name}`);
  svg.append(use);
  return svg;
}

function loadSiteIcon(image, url, onFailure) {
  let origin;
  let hostname;
  try {
    const site = new URL(url);
    origin = site.origin;
    hostname = site.hostname;
  } catch {
    onFailure();
    return;
  }

  const sources = [
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`,
    `${origin}/favicon.ico`,
  ];
  let nextSource = 0;
  image.onerror = () => {
    if (nextSource < sources.length) image.src = sources[nextSource++];
    else {
      image.onerror = null;
      onFailure();
    }
  };
  image.src = sources[nextSource++];
}

function makeStartPage() {
  const start = document.createElement("div");
  start.className = "start-page";

  const identity = document.createElement("div");
  identity.className = "start-identity";
  const logo = document.createElement("img");
  logo.src = "/logo/blueub.png";
  logo.alt = "BlueberryUB";
  const title = document.createElement("h1");
  title.textContent = "A fresh start.";
  const subtitle = document.createElement("p");
  subtitle.textContent = "A browser created by Christian Hall. (the goat)";
  identity.append(logo, title, subtitle);

  const links = document.createElement("div");
  links.className = "quick-links";
  links.setAttribute("aria-label", "Quick links");
  for (const item of quickLinks) {
    const button = document.createElement("button");
    button.className = "quick-link";
    button.type = "button";
    button.dataset.url = item.url;
    const mark = document.createElement("span");
    mark.className = `quick-link-mark ${item.color}`;
    const favicon = document.createElement("img");
    favicon.className = "quick-link-favicon";
    favicon.alt = "";
    favicon.referrerPolicy = "no-referrer";
    if (item.local) favicon.src = "/logo/blueub.png";
    else loadSiteIcon(favicon, item.url, () => favicon.replaceWith(makeIcon(item.icon, "quick-link-fallback")));
    mark.append(favicon);
    const label = document.createElement("span");
    label.textContent = item.label;
    button.append(mark, label);
    button.addEventListener("click", () => {
      if (item.local) window.location.assign(item.url);
      else navigate(item.url);
    });
    links.append(button);
  }

  start.append(identity, links);
  return start;
}

function readBookmarks() {
  try {
    const stored = JSON.parse(localStorage.getItem(bookmarksKey) || "[]");
    return Array.isArray(stored)
      ? stored.filter((item) => item && typeof item.url === "string" && typeof item.title === "string")
      : [];
  } catch {
    return [];
  }
}

let bookmarks = readBookmarks();

function saveBookmarks() {
  localStorage.setItem(bookmarksKey, JSON.stringify(bookmarks));
  renderBookmarks();
}

function renderBookmarks() {
  bookmarkBar.replaceChildren();
  const label = document.createElement("span");
  label.className = "bookmark-label";
  label.textContent = "SAVED";
  bookmarkBar.append(label);

  if (bookmarks.length === 0) {
    return;
  }

  for (const item of bookmarks) {
    const button = document.createElement("button");
    button.className = "bookmark-link";
    button.type = "button";
    button.title = item.url;
    const favicon = document.createElement("img");
    favicon.className = "bookmark-favicon";
    favicon.alt = "";
    favicon.referrerPolicy = "no-referrer";
    loadSiteIcon(favicon, item.url, () => favicon.replaceWith(makeIcon("globe", "bookmark-fallback")));
    button.append(favicon);
    const title = document.createElement("span");
    title.textContent = item.title;
    button.append(title);
    button.addEventListener("click", () => navigate(item.url));
    bookmarkBar.append(button);
  }
}

function looksLikeAddress(value) {
  return /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|\[[\da-f:]+\]|(?:[\w-]+\.)+[a-z\d-]+)(?::\d+)?(?:[/?#]|$)/i.test(value);
}

function resolveAddress(value) {
  const input = value.trim();
  if (!input) throw new Error("Enter a web address or search term.");

  const hasHttpScheme = /^https?:\/\//i.test(input);
  const hasOtherScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:(?!\d+(?:[/?#]|$))/.test(input) && !hasHttpScheme;
  if (hasOtherScheme && !/\s/.test(input)) {
    throw new Error("Only http and https websites can be opened.");
  }

  if (!hasHttpScheme && (/\s/.test(input) || !looksLikeAddress(input))) {
    return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(input)}`;
  }

  const candidate = hasHttpScheme ? input : `https://${input}`;
  const url = new URL(candidate);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https websites can be opened.");
  }
  return url.href;
}

function tabName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "New tab";
  } catch {
    return "New tab";
  }
}

function setTabView(tab, view) {
  tab.startPage.hidden = view !== "start";
  tab.loading.hidden = view !== "loading";
  tab.error.hidden = view !== "error";
  tab.iframe.hidden = view !== "browser";
}

function updateTabLocation(tab, nextUrl) {
  const url = nextUrl instanceof URL ? nextUrl.href : String(nextUrl);
  tab.url = url;
  tab.name = tabName(url);
  tab.title.textContent = tab.name;
  tab.button.title = url;
  setTabFavicon(tab, url);
  void recordVisit(tab, url);
  if (tab === activeTab) {
    addressInput.value = url;
    pageStatus.textContent = url;
    document.title = `${tab.name} - BlueberryUB`;
    updateBookmarkButton();
  }
}

function setTabFavicon(tab, url) {
  tab.favicon.src = "/logo/blueub.png";
  loadSiteIcon(tab.favicon, url, () => {
    tab.favicon.onerror = null;
    tab.favicon.src = "/logo/blueub.png";
  });
}

function installPopupGuard(tab) {
  try {
    const pageWindow = tab.iframe.contentWindow;
    const pageDocument = pageWindow?.document;
    if (!pageWindow || !pageDocument || tab.popupDocuments.has(pageDocument)) return;
    tab.popupDocuments.add(pageDocument);

    const blockOpen = () => {
      pageStatus.textContent = "Blocked a site popup";
      return null;
    };
    try {
      Object.defineProperty(pageWindow, "open", {
        configurable: true,
        writable: true,
        value: blockOpen,
      });
    } catch {
      pageWindow.open = blockOpen;
    }

    const keepNavigationInFrame = (event) => {
      const target = event.target?.closest?.("a[target], form[target]");
      if (!target || !target.target || target.target.toLowerCase() === "_self") return;
      target.target = "_self";
      pageStatus.textContent = "Opened link in this tab";
    };
    pageDocument.addEventListener("click", keepNavigationInFrame, true);
    pageDocument.addEventListener("submit", keepNavigationInFrame, true);

    const attachChildFrame = (childFrame) => {
      childFrame.addEventListener("load", () => installPopupGuard({
        iframe: childFrame,
        popupDocuments: tab.popupDocuments,
      }));
    };
    pageDocument.querySelectorAll("iframe").forEach(attachChildFrame);
    const observer = new pageWindow.MutationObserver((records) => {
      for (const node of records.flatMap((record) => [...record.addedNodes])) {
        if (node instanceof pageWindow.HTMLIFrameElement) attachChildFrame(node);
        node.querySelectorAll?.("iframe").forEach(attachChildFrame);
      }
    });
    observer.observe(pageDocument.documentElement, { childList: true, subtree: true });
  } catch {
    pageStatus.textContent = "Popup protection unavailable on this page";
  }
}

function updateBookmarkButton() {
  const saved = activeTab?.url && bookmarks.some((item) => item.url === activeTab.url);
  bookmarkButton.classList.toggle("is-bookmarked", Boolean(saved));
  bookmarkButton.setAttribute("aria-pressed", String(Boolean(saved)));
  bookmarkButton.setAttribute("aria-label", saved ? "Remove bookmark" : "Bookmark this page");
  bookmarkButton.disabled = privateMode;
  if (privateMode) bookmarkButton.title = "Bookmarks are disabled in Private mode";
  else bookmarkButton.title = saved ? "Remove bookmark" : "Bookmark this page";
}

function applyPrivateMode() {
  document.body.classList.toggle("private-mode", privateMode);
  privateModeButton.classList.toggle("is-active", privateMode);
  privateModeButton.setAttribute("aria-pressed", String(privateMode));
  privateModeButton.setAttribute("aria-label", privateMode ? "Exit Private mode" : "Enter Private mode");
  privateModeButton.title = privateMode
    ? "Private mode: Blueberry does not save history or bookmarks; site data may persist"
    : "Private mode: Blueberry does not save history or bookmarks; site data may persist";
  privateNotice.hidden = !privateMode;
  updateBookmarkButton();
}

function activateTab(tab) {
  activeTab = tab;
  for (const item of tabs) {
    const selected = item === tab;
    item.entry.classList.toggle("is-active", selected);
    item.button.setAttribute("aria-selected", String(selected));
    item.page.hidden = !selected;
  }
  addressInput.value = tab.url;
  pageStatus.textContent = tab.url || "New tab";
  document.title = `${tab.name} - BlueberryUB`;
  backButton.disabled = !tab.frame;
  forwardButton.disabled = !tab.frame;
  reloadButton.disabled = !tab.frame;
  updateBookmarkButton();
}

function createTab() {
  const id = nextTabId++;
  const entry = document.createElement("div");
  entry.className = "tab-entry";

  const button = document.createElement("button");
  button.className = "tab-button";
  button.type = "button";
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", "false");
  button.setAttribute("aria-controls", `page-${id}`);
  const favicon = document.createElement("img");
  favicon.className = "tab-favicon";
  favicon.src = "/logo/blueub.png";
  favicon.alt = "";
  favicon.referrerPolicy = "no-referrer";
  const title = document.createElement("span");
  title.className = "tab-title";
  title.textContent = "New tab";
  button.append(favicon, title);
  button.addEventListener("click", () => activateTab(tab));

  const close = document.createElement("button");
  close.className = "tab-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close tab");
  close.title = "Close tab (Ctrl+W)";
  close.append(makeIcon("close"));
  close.addEventListener("click", (event) => {
    event.stopPropagation();
    closeTab(tab);
  });
  entry.append(button, close);
  tabList.append(entry);

  const page = document.createElement("section");
  page.className = "tab-page";
  page.id = `page-${id}`;
  page.setAttribute("role", "tabpanel");
  page.hidden = true;

  const startPage = makeStartPage();
  const loading = document.createElement("div");
  loading.className = "page-message loading-message";
  loading.hidden = true;
  const spinner = document.createElement("span");
  spinner.className = "loading-spinner";
  const loadingText = document.createElement("span");
  loadingText.textContent = "Connecting to the page";
  loading.append(spinner, loadingText);

  const error = document.createElement("div");
  error.className = "page-message error-message";
  error.setAttribute("role", "alert");
  error.hidden = true;
  error.innerHTML = `<span class="error-mark">!</span><h2>Page didn’t open</h2><p class="error-detail"></p>`;

  const iframe = document.createElement("iframe");
  iframe.className = "site-frame";
  iframe.title = "BlueberryUB page";
  iframe.allow = "fullscreen; autoplay; clipboard-read; clipboard-write";
  iframe.referrerPolicy = "no-referrer";
  iframe.hidden = true;
  page.append(startPage, loading, error, iframe);
  pageHost.append(page);

  const tab = {
    id,
    url: "",
    name: "New tab",
    entry,
    button,
    title,
    favicon,
    page,
    startPage,
    loading,
    error,
    iframe,
    frame: null,
    framePromise: null,
    popupDocuments: new WeakSet(),
    lastHistoryUrl: "",
    lastHistoryAt: 0,
  };
  iframe.addEventListener("load", () => installPopupGuard(tab));
  tabs.push(tab);
  activateTab(tab);
  return tab;
}

function disposeTab(tab) {
  if (tab.frame) {
    const frames = tab.frame.controller?.frames;
    const frameIndex = frames?.indexOf(tab.frame) ?? -1;
    if (frameIndex >= 0) frames.splice(frameIndex, 1);
    tab.iframe.src = "about:blank";
    tab.frame = null;
    tab.framePromise = null;
  }
  tab.entry.remove();
  tab.page.remove();
}

function closeTab(tab) {
  if (tabs.length === 1) {
    const replacement = createTab();
    tabs = tabs.filter((item) => item !== tab);
    disposeTab(tab);
    activateTab(replacement);
    return;
  }

  const index = tabs.indexOf(tab);
  tabs = tabs.filter((item) => item !== tab);
  disposeTab(tab);
  if (tab === activeTab) activateTab(tabs[Math.max(0, index - 1)]);
}

async function getController() {
  if (!controllerPromise) {
    controllerPromise = initBootstrap().catch((error) => {
      controllerPromise = null;
      throw error;
    });
  }
  return controllerPromise;
}

async function getFrame(tab) {
  if (tab.frame) return tab.frame;
  if (!tab.framePromise) {
    tab.framePromise = (async () => {
      const controller = await getController();
      const watcher = new window.$scramjetUtils.UrlWatcherPlugin((url) => {
        updateTabLocation(tab, url);
      });
      return controller.createFrame(tab.iframe, { plugins: [watcher] });
    })().catch((error) => {
      tab.framePromise = null;
      throw error;
    });
  }
  tab.frame = await tab.framePromise;
  return tab.frame;
}

async function navigate(value, tab = activeTab) {
  if (!tab) return;
  let url;
  try {
    url = resolveAddress(value);
  } catch (error) {
    activateTab(tab);
    tab.error.querySelector(".error-detail").textContent = error.message || "Enter a valid web address.";
    setTabView(tab, "error");
    pageStatus.textContent = "Invalid address";
    addressInput.focus();
    return;
  }

  activateTab(tab);
  addressInput.value = url;
  tab.url = url;
  tab.name = tabName(url);
  tab.title.textContent = tab.name;
  tab.button.title = url;
  setTabFavicon(tab, url);
  setTabView(tab, "loading");
  pageStatus.textContent = "Connecting";
  updateBookmarkButton();

  try {
    const frame = await getFrame(tab);
    await frame.go(url);
    setTabView(tab, "browser");
    if (tab === activeTab) pageStatus.textContent = tab.url;
    backButton.disabled = false;
    forwardButton.disabled = false;
    reloadButton.disabled = false;
  } catch (error) {
    tab.error.querySelector(".error-detail").textContent = error.message || "The browser could not load this site.";
    setTabView(tab, "error");
    if (tab === activeTab) pageStatus.textContent = "Could not connect";
    console.error("BlueberryUB navigation error:", error);
  }
}

function navigateHome() {
  if (!activeTab) return;
  activeTab.url = "";
  activeTab.name = "New tab";
  activeTab.title.textContent = activeTab.name;
  activeTab.button.title = "New tab";
  setTabView(activeTab, "start");
  addressInput.value = "";
  pageStatus.textContent = "New tab";
  document.title = "New tab - BlueberryUB";
  backButton.disabled = true;
  forwardButton.disabled = true;
  reloadButton.disabled = true;
  updateBookmarkButton();
}

function toggleBookmark() {
  if (privateMode) {
    pageStatus.textContent = "Bookmarks are disabled in Private mode";
    return;
  }
  if (!activeTab?.url) return;
  const existing = bookmarks.findIndex((item) => item.url === activeTab.url);
  if (existing >= 0) {
    bookmarks.splice(existing, 1);
  } else {
    bookmarks.push({ url: activeTab.url, title: tabName(activeTab.url) });
  }
  saveBookmarks();
  updateBookmarkButton();
}

function syncFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement);
  const icon = fullscreenButton.querySelector("use");
  icon.setAttribute("href", `/icons.svg#icon-${isFullscreen ? "fullscreen-exit" : "fullscreen"}`);
  fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
  fullscreenButton.title = isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (F11)";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  navigate(addressInput.value);
});

document.querySelector("#new-tab-button").addEventListener("click", () => createTab());
document.querySelector("#home-button").addEventListener("click", navigateHome);
document.querySelector("#back-button").addEventListener("click", () => activeTab?.frame?.back());
document.querySelector("#forward-button").addEventListener("click", () => activeTab?.frame?.forward());
document.querySelector("#reload-button").addEventListener("click", () => activeTab?.frame?.reload());
bookmarkButton.addEventListener("click", toggleBookmark);
privateModeButton.addEventListener("click", () => {
  privateMode = !privateMode;
  applyPrivateMode();
  pageStatus.textContent = privateMode ? "Private mode on" : "Private mode off";
});

fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (activeTab?.frame && !activeTab.iframe.hidden) await activeTab.iframe.requestFullscreen();
    else pageStatus.textContent = "Open a site before entering fullscreen";
  } catch (error) {
    pageStatus.textContent = error.message || "Fullscreen is unavailable";
  }
});
document.addEventListener("fullscreenchange", syncFullscreenButton);

document.addEventListener("keydown", (event) => {
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === "l") {
    event.preventDefault();
    addressInput.focus();
    addressInput.select();
  } else if (modifier && event.key.toLowerCase() === "t") {
    event.preventDefault();
    createTab();
  } else if (modifier && event.key.toLowerCase() === "w") {
    event.preventDefault();
    if (activeTab) closeTab(activeTab);
  } else if (modifier && event.key.toLowerCase() === "r") {
    event.preventDefault();
    activeTab?.frame?.reload();
  } else if (event.altKey && event.key === "ArrowLeft") {
    event.preventDefault();
    activeTab?.frame?.back();
  } else if (event.altKey && event.key === "ArrowRight") {
    event.preventDefault();
    activeTab?.frame?.forward();
  } else if (event.key === "F11") {
    event.preventDefault();
    fullscreenButton.click();
  }
});

renderBookmarks();
applyPrivateMode();
void initializeHistory();
createTab();

const initialUrl = new URL(window.location.href).searchParams.get("goto");
if (initialUrl) navigate(initialUrl);