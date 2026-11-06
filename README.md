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

- `data/out/graph.json`: tag nodes, hierarchy edges, co-occurrence edges (`count` and `score`)
- `data/out/cards.json`: trimmed card data with each card's direct tags

It ends with a summary (tag, card and edge counts, edge spread, file sizes).
Paste that summary back into the project thread so we can tune the graph.

### Options

```sh
npm run prep -- --offline        # reuse the newest files in data/raw/, no network
npm run prep -- --force          # re-download even if today's files exist
npm run prep -- --min-count 3    # drop co-occurrence edges sharing fewer than 3 cards (default 2)
npm run prep:fixture             # run on the tiny test fixtures instead of real data
```

`PREP_MIN_COUNT` works as an environment variable too.

## How edges work

- **Hierarchy:** parent tag to child tag, straight from Scryfall's `parent_ids` / `child_ids`.
- **Co-occurrence:** two *leaf* tags (tags with no children) that appear on the same card.
  `count` = shared cards; `score` = sum of (weight A x weight B) over those cards.
  Parent tags never get co-occurrence edges, only hierarchy edges.
- A parent tag's `card_count` includes every card tagged with any of its descendants.
