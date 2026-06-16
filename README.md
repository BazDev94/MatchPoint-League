# MatchPoint League — Court Kings

Landing page statica con ranking Elo tennis tra amici, pubblicabile su GitHub Pages.

## Stack

- HTML
- CSS
- JavaScript vanilla
- Google Sheet (CSV pubblici) + fallback JSON locale

## Struttura progetto

```text
.
├── index.html
├── style.css
├── app.js
├── config.js
├── README.md
├── data/
│   ├── players.json
│   └── matches.json
└── assets/
    ├── logo.svg
    ├── avatars/
    └── icons/
```

## Deploy GitHub Pages

1. Vai in **Settings → Pages** del repository.
2. Seleziona:
   - **Branch:** `main`
   - **Folder:** `/root`
3. Salva e attendi l’URL pubblico.

## Configurazione sorgente dati

Modifica `config.js`:

```js
window.CONFIG = {
  dataSource: "google-sheet", // "google-sheet" | "local-json"
  googleSheet: {
    playersCsvUrl: "URL_CSV_PLAYERS",
    matchesCsvUrl: "URL_CSV_MATCHES",
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
```

### Come ottenere URL CSV da Google Sheet

1. Crea uno Sheet con tab `players` e `matches`.
2. **File → Share → Publish to web**.
3. Pubblica ogni tab in formato CSV.
4. Incolla i 2 URL in `config.js`.

## Formato tab `players`

Colonne consigliate:

```text
id,name,nickname,initialRating,avatar,hand,favoriteSurface,active
```

Obbligatorie: `id`, `name`, `initialRating`.

## Formato tab `matches`

Colonne consigliate:

```text
id,date,playerA,playerB,winner,score,surface,location,notes,format,tournament
```

Obbligatorie: `id`, `date`, `playerA`, `playerB`, `winner`, `score`.

## Aggiungere una nuova partita

Con `dataSource: "google-sheet"`:

1. Apri Google Sheet.
2. Tab `matches`.
3. Aggiungi una riga.
4. Ricarica la pagina.

Con `dataSource: "local-json"`:

1. Modifica `data/matches.json`.
2. Commit e push.

## Fallback JSON

Se `dataSource` è `google-sheet` e il CSV non è raggiungibile o non valido:

- con `fallback.enabled: true` usa i JSON locali (`data/*.json`);
- con `fallback.enabled: false` mostra errore e non renderizza la classifica.

## Errori comuni

- **Sheet non raggiungibile / URL non impostati:** messaggio "Impossibile caricare i dati da Google Sheet".
- **Dati non validi:** messaggio su colonne/valori da correggere.
- **Apertura locale con doppio click (`file://`):** avvia server HTTP.

## Preview locale

```bash
cd /percorso/progetto
python3 -m http.server 8080
```

Apri `http://localhost:8080`.
