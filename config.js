window.CONFIG = {
  dataSource: "google-sheet",

  googleSheet: {
    playersCsvUrl: "PASTE_PLAYERS_CSV_URL_HERE",
    matchesCsvUrl: "PASTE_MATCHES_CSV_URL_HERE",
  },

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
