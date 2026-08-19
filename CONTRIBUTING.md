# Contributing a puzzle

Thanks for considering adding a puzzle to Kindle Nonograms! This guide covers
everything you need to go from "I made a puzzle" to an open pull request.

## The puzzle format

A puzzle is a single JSON file describing its solution grid. It has these fields:

| Field    | Type                        | Meaning                                                              |
| -------- | --------------------------- | ---------------------------------------------------------------------- |
| `id`     | `string`                    | Ignored — see [Puzzle id](#puzzle-id) below.                          |
| `name`   | `string`                    | Display name shown in the library and on the puzzle page.            |
| `width`  | `number`                    | Number of columns.                                                   |
| `height` | `number`                    | Number of rows.                                                      |
| `palette`| `string[]`                  | Hex colors used by the puzzle, e.g. `["#000000", "#c0392b"]`.        |
| `cells`  | `(number \| null)[][]`      | Row-major solution grid; `null` = empty cell, otherwise a palette index. |

### Puzzle id

The id used for a puzzle is **always the filename without its extension**,
never the `id` field inside the JSON content — any `id` field present in the
file is discarded in favor of the filename (see
[`.vibe/decisions/001-puzzle-id-from-filename.md`](.vibe/decisions/001-puzzle-id-from-filename.md)).
You can still put an `id` field in the file if you're hand-editing a copy of
an existing puzzle, but it will simply be ignored.

### Example

```json
{
  "id": "anything-here-is-ignored",
  "name": "Small Heart",
  "width": 5,
  "height": 5,
  "palette": ["#c0392b"],
  "cells": [
    [null, 0, null, 0, null],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [null, 0, 0, 0, null],
    [null, null, 0, null, null]
  ]
}
```

This example is a fenced code block in this document, not a real file — do
not copy it into `data/puzzles/` verbatim. Every `*.json` file under
`data/puzzles/` is automatically discovered and loaded by the site build, so
a stray template file placed there would break the build.

## Where to put your puzzle

Save your file at `data/puzzles/<id>.json`, where `<id>` is the filename you
want the puzzle to have (kebab-case, no spaces recommended). For example, a
file named `data/puzzles/small-heart.json` gets the id `small-heart`.

## Before opening a pull request

Run these commands locally and make sure they all succeed:

```bash
npm test
npm run lint
npm run build
```

`npm run build` in particular validates every puzzle file's structure — it
will fail with a descriptive error if your puzzle's dimensions, palette, or
cell values are inconsistent.

## Opening the pull request

Open a PR against `main` with your puzzle file. The PR template will walk you
through a short checklist covering the filename, palette, the commands
above, and content licensing.
