const CONFIG = window.CONFIG ?? {
  dataSource: "local-json",
  fallback: {
    enabled: true,
    playersJsonUrl: "./data/players.json",
    matchesJsonUrl: "./data/matches.json",
  },
  elo: {
    defaultRating: 1500,
    kFactor: 32,
  },
};

const K_FACTOR = Number(CONFIG.elo?.kFactor ?? 32);
const DEFAULT_RATING = Number(CONFIG.elo?.defaultRating ?? 1500);
const RECENT_MATCHES_LIMIT = 8;

const elements = {
  heroStats: document.getElementById("heroStats"),
  podium: document.getElementById("podium"),
  rankingBody: document.getElementById("rankingBody"),
  latestMatches: document.getElementById("latestMatches"),
  highlights: document.getElementById("highlights"),
  playerCards: document.getElementById("playerCards"),
  statusBanner: document.getElementById("statusBanner"),
  emptyTemplate: document.getElementById("emptyStateTemplate"),
  lastUpdate: document.getElementById("lastUpdate"),
};

const formatDate = (date) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));

const roundRating = (value) => Math.round(value);

function setStatus(message, type = "info") {
  if (!elements.statusBanner) return;
  elements.statusBanner.textContent = message;
  elements.statusBanner.className = `status-banner show ${type}`;
}

function clearStatus() {
  if (!elements.statusBanner) return;
  elements.statusBanner.className = "status-banner";
  elements.statusBanner.textContent = "";
}

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sanitizeCell(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function parseBoolean(value, defaultValue = true) {
  const normalized = sanitizeCell(value).toLowerCase();
  if (!normalized) return defaultValue;
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return defaultValue;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => sanitizeCell(value) !== "")) {
        rows.push(row.map((value) => sanitizeCell(value)));
      }
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => sanitizeCell(value) !== "")) {
      rows.push(row.map((value) => sanitizeCell(value)));
    }
  }

  if (!rows.length) return [];
  const headers = rows[0].map((header) => sanitizeCell(header));
  return rows.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = sanitizeCell(values[index] ?? "");
    });
    return record;
  });
}

async function fetchJson(path) {
  let response;
  try {
    response = await fetch(path);
  } catch (_error) {
    if (window.location.protocol === "file:") {
      throw createError(
        "FILE_PROTOCOL",
        "Stai aprendo index.html direttamente dal file system. Avvia un server locale (es. `python3 -m http.server`) oppure usa GitHub Pages."
      );
    }
    throw createError("NETWORK", `Errore di rete durante il caricamento di ${path}`);
  }
  if (!response.ok) {
    throw createError("NETWORK", `Errore caricamento: ${path}`);
  }
  try {
    return await response.json();
  } catch (_error) {
    throw createError("INVALID_JSON", `JSON non valido: ${path}`);
  }
}

async function fetchText(path) {
  let response;
  try {
    response = await fetch(path);
  } catch (_error) {
    if (window.location.protocol === "file:") {
      throw createError(
        "FILE_PROTOCOL",
        "Stai aprendo index.html direttamente dal file system. Avvia un server locale (es. `python3 -m http.server`) oppure usa GitHub Pages."
      );
    }
    throw createError("NETWORK", `Impossibile raggiungere ${path}`);
  }
  if (!response.ok) {
    throw createError("NETWORK", `Risposta non valida da ${path}`);
  }
  return response.text();
}

async function loadCsv(path) {
  const text = await fetchText(path);
  const rows = parseCsv(text);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw createError("INVALID_DATA", "CSV vuoto o non valido.");
  }
  return rows;
}

function normalizePlayer(rawPlayer) {
  const id = sanitizeCell(rawPlayer.id).toLowerCase();
  const name = sanitizeCell(rawPlayer.name);
  const ratingRaw = sanitizeCell(rawPlayer.initialRating);
  const initialRating = ratingRaw ? Number(ratingRaw) : DEFAULT_RATING;

  if (!id || !name || Number.isNaN(initialRating)) {
    throw createError(
      "INVALID_DATA",
      "Alcuni dati del Google Sheet non sono validi. Controlla id, name e initialRating dei giocatori."
    );
  }

  return {
    id,
    name,
    nickname: sanitizeCell(rawPlayer.nickname) || undefined,
    avatar: sanitizeCell(rawPlayer.avatar) || undefined,
    initialRating,
    hand: sanitizeCell(rawPlayer.hand) || undefined,
    favoriteSurface: sanitizeCell(rawPlayer.favoriteSurface) || undefined,
    active: parseBoolean(rawPlayer.active, true),
  };
}

function normalizeMatch(rawMatch) {
  const id = sanitizeCell(rawMatch.id);
  const date = sanitizeCell(rawMatch.date);
  const playerA = sanitizeCell(rawMatch.playerA).toLowerCase();
  const playerB = sanitizeCell(rawMatch.playerB).toLowerCase();
  const winner = sanitizeCell(rawMatch.winner).toLowerCase();
  const score = sanitizeCell(rawMatch.score);

  if (!id || !date || !playerA || !playerB || !winner || !score) {
    throw createError(
      "INVALID_DATA",
      "Alcuni dati del Google Sheet non sono validi. Controlla partite e colonne obbligatorie."
    );
  }

  return {
    id,
    date,
    playerA,
    playerB,
    winner,
    score,
    surface: sanitizeCell(rawMatch.surface) || undefined,
    location: sanitizeCell(rawMatch.location) || undefined,
    notes: sanitizeCell(rawMatch.notes) || undefined,
    format: sanitizeCell(rawMatch.format) || undefined,
    tournament: sanitizeCell(rawMatch.tournament) || undefined,
  };
}

function normalizePlayers(rawPlayers) {
  if (!Array.isArray(rawPlayers)) {
    throw createError("INVALID_DATA", "Players non è un array valido.");
  }
  return rawPlayers.map(normalizePlayer);
}

function normalizeMatches(rawMatches) {
  if (!Array.isArray(rawMatches)) {
    throw createError("INVALID_DATA", "Matches non è un array valido.");
  }
  return rawMatches.map(normalizeMatch);
}

async function loadLocalJsonData() {
  const fallbackConfig = CONFIG.fallback ?? {};
  const playersPath = fallbackConfig.playersJsonUrl ?? "./data/players.json";
  const matchesPath = fallbackConfig.matchesJsonUrl ?? "./data/matches.json";
  const [players, matches] = await Promise.all([fetchJson(playersPath), fetchJson(matchesPath)]);
  return {
    players: normalizePlayers(players),
    matches: normalizeMatches(matches),
    source: "local-json",
  };
}

async function loadGoogleSheetData() {
  const playersCsvUrl = sanitizeCell(CONFIG.googleSheet?.playersCsvUrl);
  const matchesCsvUrl = sanitizeCell(CONFIG.googleSheet?.matchesCsvUrl);
  if (!playersCsvUrl || !matchesCsvUrl || playersCsvUrl.includes("PASTE_") || matchesCsvUrl.includes("PASTE_")) {
    throw createError(
      "MISSING_CONFIG",
      "URL CSV non configurati. Imposta playersCsvUrl e matchesCsvUrl in config.js."
    );
  }

  const [playersRaw, matchesRaw] = await Promise.all([loadCsv(playersCsvUrl), loadCsv(matchesCsvUrl)]);
  return {
    players: normalizePlayers(playersRaw),
    matches: normalizeMatches(matchesRaw),
    source: "google-sheet",
  };
}

async function loadLeagueData() {
  if (CONFIG.dataSource === "google-sheet") {
    try {
      return await loadGoogleSheetData();
    } catch (error) {
      const fallbackEnabled = Boolean(CONFIG.fallback?.enabled);
      if (!fallbackEnabled) throw error;
      const fallbackData = await loadLocalJsonData();
      setStatus(
        "Dati Google Sheet non disponibili. Sto mostrando l’ultima versione locale disponibile.",
        "info"
      );
      return fallbackData;
    }
  }

  return loadLocalJsonData();
}

function validatePlayers(players) {
  if (!Array.isArray(players) || players.length === 0) {
    throw createError("INVALID_DATA", "Nessun giocatore disponibile.");
  }
  const ids = new Set();
  for (const player of players) {
    if (!player?.id || !player?.name) {
      throw createError("INVALID_DATA", "Ogni giocatore deve avere id e name.");
    }
    if (ids.has(player.id)) {
      throw createError("INVALID_DATA", `ID giocatore duplicato: ${player.id}`);
    }
    ids.add(player.id);
    if (
      player.initialRating !== undefined &&
      (typeof player.initialRating !== "number" || Number.isNaN(player.initialRating))
    ) {
      throw createError("INVALID_DATA", `initialRating non valido per ${player.id}`);
    }
  }
}

function validateMatch(match) {
  const requiredFields = ["id", "date", "playerA", "playerB", "winner", "score"];
  for (const field of requiredFields) {
    if (!match?.[field]) {
      throw createError("INVALID_DATA", `Partita non valida: campo "${field}" mancante.`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(match.date)) {
    throw createError("INVALID_DATA", `Partita ${match.id}: formato data non valido (YYYY-MM-DD).`);
  }
}

function expectedScore(playerRating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

function applyElo(match, playerAStats, playerBStats) {
  const expA = expectedScore(playerAStats.rating, playerBStats.rating);
  const expB = expectedScore(playerBStats.rating, playerAStats.rating);
  const winnerIsA = match.winner === match.playerA;
  const scoreA = winnerIsA ? 1 : 0;
  const scoreB = winnerIsA ? 0 : 1;

  const newA = roundRating(playerAStats.rating + K_FACTOR * (scoreA - expA));
  const newB = roundRating(playerBStats.rating + K_FACTOR * (scoreB - expB));

  const deltaA = newA - playerAStats.rating;
  const deltaB = newB - playerBStats.rating;

  playerAStats.previousRating = playerAStats.rating;
  playerBStats.previousRating = playerBStats.rating;
  playerAStats.rating = newA;
  playerBStats.rating = newB;
  playerAStats.bestRating = Math.max(playerAStats.bestRating, newA);
  playerBStats.bestRating = Math.max(playerBStats.bestRating, newB);
  playerAStats.lastDelta = deltaA;
  playerBStats.lastDelta = deltaB;
  playerAStats.lastMatchDate = match.date;
  playerBStats.lastMatchDate = match.date;
  playerAStats.matches += 1;
  playerBStats.matches += 1;

  if (winnerIsA) {
    playerAStats.wins += 1;
    playerBStats.losses += 1;
    playerAStats.streak = playerAStats.streak >= 0 ? playerAStats.streak + 1 : 1;
    playerBStats.streak = playerBStats.streak <= 0 ? playerBStats.streak - 1 : -1;
  } else {
    playerBStats.wins += 1;
    playerAStats.losses += 1;
    playerBStats.streak = playerBStats.streak >= 0 ? playerBStats.streak + 1 : 1;
    playerAStats.streak = playerAStats.streak <= 0 ? playerAStats.streak - 1 : -1;
  }

  return {
    ...match,
    deltaA,
    deltaB,
    afterA: newA,
    afterB: newB,
  };
}

function createInitialStats(players) {
  return new Map(
    players.map((player) => [
      player.id,
      {
        ...player,
        rating: player.initialRating ?? DEFAULT_RATING,
        previousRating: player.initialRating ?? DEFAULT_RATING,
        bestRating: player.initialRating ?? DEFAULT_RATING,
        lastDelta: 0,
        matches: 0,
        wins: 0,
        losses: 0,
        streak: 0,
        lastMatchDate: null,
        previousPosition: null,
      },
    ])
  );
}

function rankingSort(a, b) {
  const winRateA = a.matches ? a.wins / a.matches : 0;
  const winRateB = b.matches ? b.wins / b.matches : 0;
  return (
    b.rating - a.rating ||
    b.wins - a.wins ||
    winRateB - winRateA ||
    b.matches - a.matches ||
    a.name.localeCompare(b.name, "it")
  );
}

function computeRivalry(processedMatches) {
  const pairs = new Map();
  for (const match of processedMatches) {
    const key = [match.playerA, match.playerB].sort().join("__");
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  let best = null;
  for (const [pair, count] of pairs.entries()) {
    if (!best || count > best.count) best = { pair, count };
  }
  return best;
}

function renderHero(playersStats, processedMatches) {
  const leader = playersStats[0];
  const items = [
    ["Leader attuale", leader ? leader.name : "-"],
    ["Partite registrate", String(processedMatches.length)],
    ["Giocatori attivi", String(playersStats.length)],
  ];
  elements.heroStats.innerHTML = items
    .map(
      ([label, value]) => `
      <div class="stat">
        <span class="stat-label">${label}</span>
        <span class="stat-value">${value}</span>
      </div>`
    )
    .join("");
}

function renderPodium(playersStats) {
  const topThree = playersStats.slice(0, 3);
  if (topThree.length === 0) {
    elements.podium.innerHTML = "";
    return;
  }
  const classes = ["gold", "silver", "bronze"];
  elements.podium.innerHTML = topThree
    .map((player, index) => {
      const rank = index + 1;
      return `
        <article class="podium-card ${classes[index]}">
          <p class="podium-rank"><em>#${rank}</em> posto</p>
          <h3 class="podium-name">${player.name}</h3>
          <p class="podium-meta">${player.nickname ?? "Nessun nickname"}</p>
          <p><strong>${player.rating}</strong> Elo</p>
        </article>
      `;
    })
    .join("");
}

function streakLabel(streak) {
  if (streak > 0) return `W${streak}`;
  if (streak < 0) return `L${Math.abs(streak)}`;
  return "-";
}

function formatDelta(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function renderRanking(playersStats) {
  elements.rankingBody.innerHTML = playersStats
    .map((player) => {
      const winRate = player.matches ? (player.wins / player.matches) * 100 : 0;
      const deltaClass = player.lastDelta >= 0 ? "up" : "down";
      return `
      <tr>
        <td>${player.position}</td>
        <td>
          <strong>${player.name}</strong>
          <div class="muted">${player.nickname ?? ""}</div>
        </td>
        <td>${player.rating}</td>
        <td class="${deltaClass}">${formatDelta(player.lastDelta)}</td>
        <td>${player.wins}</td>
        <td>${player.losses}</td>
        <td>${winRate.toFixed(0)}%</td>
        <td>${streakLabel(player.streak)}</td>
      </tr>
      `;
    })
    .join("");
}

function renderPlayerCards(playersStats) {
  if (!elements.playerCards) return;
  elements.playerCards.innerHTML = playersStats
    .map((player) => {
      const winRate = player.matches ? ((player.wins / player.matches) * 100).toFixed(0) : "0";
      const prevPos = player.previousPosition ?? "-";
      const lastMatch = player.lastMatchDate ? formatDate(player.lastMatchDate) : "-";
      return `
      <article class="card player-card">
        <div class="player-head">
          <img class="avatar" src="${player.avatar ?? ""}" alt="Avatar di ${player.name}" loading="lazy" />
          <div>
            <h3 class="player-name">${player.name}</h3>
            <p class="player-sub">${player.nickname ?? "No nickname"} · ${player.hand ?? "-"} hand</p>
          </div>
        </div>
        <div class="player-grid">
          <div class="mini"><div class="mini-label">Rating</div><div class="mini-value">${player.rating}</div></div>
          <div class="mini"><div class="mini-label">Best</div><div class="mini-value">${player.bestRating}</div></div>
          <div class="mini"><div class="mini-label">Match</div><div class="mini-value">${player.matches}</div></div>
          <div class="mini"><div class="mini-label">Win rate</div><div class="mini-value">${winRate}%</div></div>
          <div class="mini"><div class="mini-label">Prev pos</div><div class="mini-value">${prevPos}</div></div>
          <div class="mini"><div class="mini-label">Ultima</div><div class="mini-value">${lastMatch}</div></div>
        </div>
      </article>`;
    })
    .join("");
}

function renderMatches(processedMatches, playerById) {
  const recent = [...processedMatches].reverse().slice(0, RECENT_MATCHES_LIMIT);
  if (recent.length === 0) {
    elements.latestMatches.innerHTML = "";
    return;
  }
  elements.latestMatches.innerHTML = recent
    .map((match) => {
      const playerA = playerById.get(match.playerA);
      const playerB = playerById.get(match.playerB);
      const winnerName = playerById.get(match.winner)?.name ?? match.winner;
      const loserName = match.winner === match.playerA ? playerB?.name ?? match.playerB : playerA?.name ?? match.playerA;
      return `
      <article class="card match-card">
        <h3 class="match-title">${winnerName} def. ${loserName}</h3>
        <p class="match-sub">${formatDate(match.date)} · ${match.surface ?? "surface n/d"}</p>
        <p><strong>${match.score}</strong></p>
        <p>${playerA?.name ?? match.playerA} ${formatDelta(match.deltaA)} | ${playerB?.name ?? match.playerB} ${formatDelta(match.deltaB)}</p>
      </article>`;
    })
    .join("");
}

function renderHighlights(processedMatches, playersStats, playerById) {
  const latest = processedMatches.length ? processedMatches[processedMatches.length - 1] : null;
  const bestWinRate = [...playersStats]
    .filter((p) => p.matches > 0)
    .sort((a, b) => b.wins / b.matches - a.wins / a.matches)[0];
  const mostMatches = [...playersStats].sort((a, b) => b.matches - a.matches)[0];
  const bestStreak = [...playersStats].sort((a, b) => Math.abs(b.streak) - Math.abs(a.streak))[0];
  const rivalry = computeRivalry(processedMatches);
  const inForm = [...playersStats].sort((a, b) => b.lastDelta - a.lastDelta)[0];

  const rivalryLabel = rivalry
    ? `${rivalry.pair
        .split("__")
        .map((id) => playerById.get(id)?.name ?? id)
        .join(" vs ")} (${rivalry.count})`
    : "-";

  const cards = [
    ["Partita più recente", latest ? `${formatDate(latest.date)} · ${latest.score}` : "-"],
    ["Giocatore più in forma", inForm ? `${inForm.name} (${formatDelta(inForm.lastDelta)})` : "-"],
    [
      "Miglior win rate",
      bestWinRate ? `${bestWinRate.name} (${((bestWinRate.wins / bestWinRate.matches) * 100).toFixed(0)}%)` : "-",
    ],
    ["Rivalità più giocata", rivalryLabel],
    ["Più partite giocate", mostMatches ? `${mostMatches.name} (${mostMatches.matches})` : "-"],
    ["Miglior streak attiva", bestStreak ? `${bestStreak.name} (${streakLabel(bestStreak.streak)})` : "-"],
  ];

  elements.highlights.innerHTML = cards
    .map(
      ([title, value]) => `
      <article class="card highlight-card">
        <div class="highlight-title">${title}</div>
        <div class="highlight-value">${value}</div>
      </article>
    `
    )
    .join("");
}

function renderEmptyState() {
  elements.latestMatches.innerHTML = "";
  const fragment = elements.emptyTemplate.content.cloneNode(true);
  elements.latestMatches.appendChild(fragment);
}

function parseAndCompute(players, matches) {
  validatePlayers(players);
  if (!Array.isArray(matches)) {
    throw createError("INVALID_DATA", "Matches deve essere un array.");
  }

  const playerById = createInitialStats(players);
  const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  const processedMatches = [];
  const previousPositionById = new Map();

  for (let i = 0; i < sortedMatches.length; i += 1) {
    const match = sortedMatches[i];
    validateMatch(match);
    const playerAStats = playerById.get(match.playerA);
    const playerBStats = playerById.get(match.playerB);
    if (!playerAStats || !playerBStats) {
      throw createError("INVALID_DATA", `Partita ${match.id}: playerA/playerB non presenti in players.`);
    }
    if (match.winner !== match.playerA && match.winner !== match.playerB) {
      throw createError("INVALID_DATA", `Partita ${match.id}: winner non valido.`);
    }
    if (i === sortedMatches.length - 1) {
      const snapshot = [...playerById.values()].sort(rankingSort);
      snapshot.forEach((player, index) => previousPositionById.set(player.id, index + 1));
    }
    processedMatches.push(applyElo(match, playerAStats, playerBStats));
  }

  const ranking = [...playerById.values()].sort(rankingSort);
  ranking.forEach((player, index) => {
    player.position = index + 1;
    player.previousPosition = previousPositionById.get(player.id) ?? null;
  });

  const visibleRanking = ranking.filter((player) => player.active !== false);
  visibleRanking.forEach((player, index) => {
    player.position = index + 1;
  });

  return { ranking: visibleRanking, processedMatches, playerById };
}

function clearUi() {
  if (elements.heroStats) elements.heroStats.innerHTML = "";
  if (elements.podium) elements.podium.innerHTML = "";
  if (elements.rankingBody) elements.rankingBody.innerHTML = "";
  if (elements.playerCards) elements.playerCards.innerHTML = "";
  if (elements.latestMatches) elements.latestMatches.innerHTML = "";
  if (elements.highlights) elements.highlights.innerHTML = "";
}

function toUiErrorMessage(error) {
  const details = error instanceof Error ? error.message : "";
  const code = error?.code;
  if (code === "NETWORK" || code === "MISSING_CONFIG" || code === "FILE_PROTOCOL") {
    return details
      ? `Impossibile caricare i dati da Google Sheet. La classifica potrebbe non essere aggiornata. (${details})`
      : "Impossibile caricare i dati da Google Sheet. La classifica potrebbe non essere aggiornata.";
  }
  if (code === "INVALID_DATA" || code === "INVALID_JSON") {
    return details
      ? `Alcuni dati del Google Sheet non sono validi. Controlla nomi giocatori, vincitore e formato delle date. (${details})`
      : "Alcuni dati del Google Sheet non sono validi. Controlla nomi giocatori, vincitore e formato delle date.";
  }
  return details
    ? `Impossibile caricare i dati della lega. (${details})`
    : "Impossibile caricare i dati della lega.";
}

async function main() {
  clearStatus();
  try {
    const { players, matches } = await loadLeagueData();
    const { ranking, processedMatches, playerById } = parseAndCompute(players, matches);
    renderHero(ranking, processedMatches);
    renderPodium(ranking);
    renderRanking(ranking);
    renderPlayerCards(ranking);
    renderMatches(processedMatches, playerById);
    renderHighlights(processedMatches, ranking, playerById);

    if (processedMatches.length === 0) {
      setStatus(
        "La stagione non è ancora iniziata. Aggiungi la prima partita in matches (Sheet o JSON) per accendere la classifica.",
        "info"
      );
      renderEmptyState();
    }

    elements.lastUpdate.textContent = new Date().toLocaleDateString("it-IT");
  } catch (error) {
    setStatus(toUiErrorMessage(error), "error");
    clearUi();
    console.error(error);
  }
}

main();
