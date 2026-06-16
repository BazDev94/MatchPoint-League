# Court Kings — Tennis Friends Ranking

Landing page statica per classifica tennis tra amici con calcolo Elo lato browser.

MatchPoint League è la lega tennis tra amici dove ogni partita aggiorna classifica, statistiche e rivalità. Un modo semplice e competitivo per scoprire chi comanda davvero il campo.

## Stack

- HTML
- CSS
- JavaScript vanilla
- JSON statici
- GitHub Pages

## Struttura progetto

```text
.
├── index.html
├── style.css
├── app.js
├── README.md
├── data/
│   ├── players.json
│   └── matches.json
└── assets/
    ├── logo.svg
    └── avatars/
```

## Dati

### `data/players.json`

Campi obbligatori:

- `id`
- `name`
- `initialRating` (se assente usa 1500)

### `data/matches.json`

Campi obbligatori:

- `id`
- `date` (`YYYY-MM-DD`)
- `playerA`
- `playerB`
- `winner`
- `score`

## Aggiornare risultati

1. Apri `data/matches.json`.
2. Aggiungi una nuova partita.
3. Commit e push su `main`.
4. GitHub Pages aggiorna automaticamente il sito.

Esempio commit:

```text
Add Marco vs Luca result
```

## Deploy su GitHub Pages

1. Vai su **Settings → Pages** del repository.
2. Imposta:
   - **Branch:** `main`
   - **Folder:** `/root`
3. Salva e attendi l’URL pubblico.
