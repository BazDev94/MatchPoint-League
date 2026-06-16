window.CONFIG = {
  dataSource: "google-sheet",

  googleSheet: {
    playersCsvUrl:
      "https://docs.google.com/spreadsheets/d/1tedq0LdTcXYDpmok33pqM3XvbPYS2Bvih6LFUM4PMmc/gviz/tq?tqx=out:csv&sheet=players",
    matchesCsvUrl:
      "https://docs.google.com/spreadsheets/d/1tedq0LdTcXYDpmok33pqM3XvbPYS2Bvih6LFUM4PMmc/gviz/tq?tqx=out:csv&sheet=matches",
  },

  fallback: {
    enabled: false,
    playersJsonUrl: "./data/players.json",
    matchesJsonUrl: "./data/matches.json",
  },

  elo: {
    defaultRating: 1500,
    kFactor: 32,
  },
};


