window.CONFIG = {
  dataSource: "google-sheet",

  googleSheet: {
    playersCsvUrl:
      "https://docs.google.com/spreadsheets/d/1m5vHG6Ntd0_dZqJL5kfTOHgeJoUbsx1uflvjpyI8NC4/gviz/tq?tqx=out:csv&sheet=players",
    matchesCsvUrl:
      "https://docs.google.com/spreadsheets/d/1m5vHG6Ntd0_dZqJL5kfTOHgeJoUbsx1uflvjpyI8NC4/gviz/tq?tqx=out:csv&sheet=matches",
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
