// Keep games cross-origin from the app while preserving storage inside the sandbox.
const CDN_ROOT = "https://gcore.jsdelivr.net/gh/gmshelf/";
const GAME_ROOT = "https://raw.githack.com/gmshelf/";
const GAME_BRANCH = "main";
const libraries = [
  { id: "seraph", name: "Seraph" },
  { id: "ckv", name: "CKV" },
  { id: "truffled", name: "Truffled" },
  { id: "ugs", name: "UGS" },
];
const gamesGrid = document.querySelector("#games-grid");
const librarySelect = document.querySelector("#library-select");
const searchInput = document.querySelector("#game-search");
const catalogStatus = document.querySelector("#catalog-status");
const libraryErrors = document.querySelector("#library-errors");
const loadMoreButton = document.querySelector("#load-more");
const gameDialog = document.querySelector("#game-dialog");
const gameFrame = document.querySelector("#game-frame");
const playerTitle = document.querySelector("#player-title");
const playerSource = document.querySelector("#player-source");
const pageSize = 72;

let games = [];
let renderedCount = 0;

function libraryAssetUrl(libraryId, path, root = CDN_ROOT, branch = "") {
  if (typeof path !== "string" || !path.trim()) return null;
  const relativePath = path.trim().replace(/^\/+/, "");
  if (
    !relativePath
    || relativePath.includes("\\")
    || /^[a-z][a-z\d+.-]*:/i.test(relativePath)
    || relativePath.split(/[/?#]/).includes("..")
  ) return null;

  const base = new URL(`${libraryId}/${branch ? `${branch}/` : ""}`, root);
  const result = new URL(relativePath, base);
  if (result.origin !== base.origin || !result.pathname.startsWith(base.pathname)) return null;
  return result.href;
}

function normalizeManifest(data) {
  const entries = Array.isArray(data) ? data : data?.games;
  if (!Array.isArray(entries)) throw new Error("The manifest did not contain a game list.");
  return entries.flatMap((entry) => {
    if (!entry || typeof entry.name !== "string" || typeof entry.url !== "string") return [];
    const url = libraryAssetUrl(entry.libraryId, entry.url, GAME_ROOT, GAME_BRANCH);
    if (!url) return [];
    return [{
      name: entry.name.trim() || "Untitled game",
      url,
      image: libraryAssetUrl(entry.libraryId, entry.img),
      libraryId: entry.libraryId,
      libraryName: entry.libraryName,
    }];
  });
}

async function loadLibraries() {
  games = [];
  renderedCount = 0;
  gamesGrid.replaceChildren();
  libraryErrors.hidden = true;
  libraryErrors.replaceChildren();
  loadMoreButton.hidden = true;
  catalogStatus.textContent = "Loading game libraries…";

  const results = await Promise.all(libraries.map(async (library) => {
    try {
      const response = await fetch(new URL(`${library.id}.json`, `${CDN_ROOT}${library.id}/`), {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      const entries = normalizeManifest(
        Array.isArray(manifest)
          ? manifest.map((entry) => ({ ...entry, libraryId: library.id, libraryName: library.name }))
          : {
              ...manifest,
              games: manifest?.games?.map((entry) => ({ ...entry, libraryId: library.id, libraryName: library.name })),
            },
      );
      return { library, entries };
    } catch (error) {
      return { library, error: error instanceof Error ? error.message : String(error) };
    }
  }));

  for (const result of results) {
    if (result.error) continue;
    games.push(...result.entries);
  }

  const failures = results.filter((result) => result.error);
  if (failures.length) {
    const heading = document.createElement("strong");
    heading.textContent = "Some game libraries could not be loaded:";
    const list = document.createElement("ul");
    for (const failure of failures) {
      const item = document.createElement("li");
      item.textContent = `${failure.library.name}: ${failure.error}`;
      list.append(item);
    }
    libraryErrors.append(heading, list);
    libraryErrors.hidden = false;
  }

  if (!games.length) {
    catalogStatus.textContent = "No game libraries are available. Check your connection and try again.";
    return;
  }

  catalogStatus.textContent = `${games.length.toLocaleString()} games loaded from ${libraries.length - failures.length} libraries.`;
  renderGames();
}

function filteredGames() {
  const selectedLibrary = librarySelect.value;
  const query = searchInput.value.trim().toLocaleLowerCase();
  return games.filter((game) =>
    (!selectedLibrary || game.libraryId === selectedLibrary)
    && (!query || game.name.toLocaleLowerCase().includes(query)),
  );
}

function createGameCard(game) {
  const button = document.createElement("button");
  button.className = "game-card";
  button.type = "button";
  button.setAttribute("aria-label", `Play ${game.name} from ${game.libraryName}`);

  const art = document.createElement("span");
  art.className = "game-art";
  const fallback = document.createElement("span");
  fallback.className = "game-art-fallback";
  fallback.textContent = game.name.slice(0, 1).toUpperCase();
  if (game.image) {
    const image = document.createElement("img");
    image.src = game.image;
    image.alt = "";
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => image.replaceWith(fallback), { once: true });
    art.append(image);
  } else {
    art.append(fallback);
  }

  const name = document.createElement("span");
  name.className = "game-name";
  name.textContent = game.name;
  const source = document.createElement("span");
  source.className = "game-library";
  source.textContent = game.libraryName;
  button.append(art, name, source);
  button.addEventListener("click", () => openGame(game));
  return button;
}

function renderGames() {
  const filtered = filteredGames();
  const nextGames = filtered.slice(renderedCount, renderedCount + pageSize);
  const fragment = document.createDocumentFragment();
  for (const game of nextGames) fragment.append(createGameCard(game));
  gamesGrid.append(fragment);
  renderedCount += nextGames.length;
  loadMoreButton.hidden = renderedCount >= filtered.length;
  if (filtered.length === 0) {
    catalogStatus.textContent = "No games match your search.";
  } else if (libraryErrors.hidden) {
    catalogStatus.textContent = `${filtered.length.toLocaleString()} games${librarySelect.value ? ` in ${libraries.find((library) => library.id === librarySelect.value)?.name}` : ""}.`;
  }
}

function refreshGames() {
  renderedCount = 0;
  gamesGrid.replaceChildren();
  renderGames();
}

function openGame(game) {
  playerTitle.textContent = game.name;
  playerSource.textContent = `Provided by ${game.libraryName}`;
  gameFrame.title = game.name;
  gameFrame.src = game.url;
  gameDialog.showModal();
}

librarySelect.addEventListener("change", refreshGames);
searchInput.addEventListener("input", refreshGames);
loadMoreButton.addEventListener("click", renderGames);
document.querySelector("#close-game").addEventListener("click", () => gameDialog.close());
gameDialog.addEventListener("click", (event) => {
  if (event.target === gameDialog) gameDialog.close();
});
gameDialog.addEventListener("close", () => {
  gameFrame.removeAttribute("src");
});
document.querySelector("#fullscreen-game").addEventListener("click", async () => {
  try {
    await gameFrame.requestFullscreen();
  } catch (error) {
    catalogStatus.textContent = `Could not enter fullscreen: ${error.message}`;
  }
});

void loadLibraries();
