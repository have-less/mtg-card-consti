# MTG tag graph (local prototype)

Turns Scryfall's oracle tags into a graph you can explore with Cosmograph.
This repo is step 1 of the local prototype: the data prep. The viewer comes next.

## Run it

Needs Node 20 or newer.

```sh
npm install
npm test          # unit tests on small fixtures
npm run prep      # downloads Scryfall data (about 30 MB gzipped), writes data/out/
```

`npm run prep` downloads `oracle_cards` and `oracle_tags` into `data/raw/` once per day,
then writes:

- `data/out/graph.json`: tag nodes (with community, top-level parent and dominant color),
  hierarchy edges, and each tag's strongest co-occurrence edges. Edges point at nodes by array index.
- `data/out/cards.json`: trimmed card data with each card's direct tags

It ends with a summary (tag, card and edge counts, NPMI spread, community sizes, file sizes).
Paste that summary back into the project thread so we can tune the graph.

### Viewer

```sh
npm run dev       # after npm run prep; open http://localhost:5173
```

Tags are nodes, colored by community, linked by each tag's top 5 edges by NPMI plus
hierarchy links (amber). Cosmograph loads DuckDB-Wasm from the jsDelivr CDN, so the
first load needs internet. All Cosmograph calls live in `src/graph/renderer.ts`.

### Deck page

Open `/deck.html` (or the **Deck →** link) and paste a deck list. Arena, MTGO, Moxfield
and Archidekt exports work, and each card counts once. **Tags** shows the deck's tags,
sized by how many deck cards have them and linked by the main graph's edges. **Cards**
shows the deck's cards, linked to the cards they share the most tags with. The list is
saved in the browser.

### Deploy

`npm run build` copies `data/out/graph.json` and `cards.json` into `dist/` and fails if
they're missing. On Vercel, `vercel.json` runs `npm run prep && npm run build`, so each
deploy downloads fresh Scryfall bulk data and rebuilds the graph.

### Options

```sh
npm run prep -- --offline        # reuse the newest files in data/raw/, no network
npm run prep -- --force          # re-download even if today's files exist
npm run prep -- --min-count 5    # drop co-occurrence pairs sharing fewer than 5 cards (default 3)
npm run prep:fixture             # run on the tiny test fixtures instead of real data
```

`PREP_MIN_COUNT` works as an environment variable too. Every other tuning value
(edges shipped per tag, community settings, tagging weight levels) is in `src/config.ts`.

## How edges work

- **Hierarchy:** parent tag to child tag, straight from Scryfall's `parent_ids` / `child_ids`.
- **Co-occurrence:** two *leaf* tags (tags with no children) that appear on the same card.
  Parent tags never get co-occurrence edges, only hierarchy edges.
  - `count` = shared cards
  - `score` = sum of (weight A x weight B) over those cards. Scryfall stores weight as a level
    (`median`, `strong`, `very_strong`), mapped to numbers by `WEIGHT_LEVELS` in `src/config.ts`.
  - `npmi` = normalized pointwise mutual information: 0 at chance, 1 when the tags always appear together.
    Pairs at or below chance are dropped.
  - `cosine` = count / sqrt(cards with A x cards with B)
- Only edges in the top 30 of either endpoint under any of those four scores are shipped.
- A parent tag's `card_count` includes every card tagged with any of its descendants.
- **Communities:** Louvain on each leaf tag's top 5 edges by NPMI, seeded so rebuilds match.
  Community 0 is the largest; -1 means the tag has no edges.
