# cm-pgn-viewer

A PGN viewer for the web. It shows a chess game with **variations, NAGs and comments** next to an SVG chessboard, and it plays **Chess960** and games **from any start position**. Vanilla ES6 modules, no framework, no build step, no icon font.

- **[Repository](https://github.com/shaack/cm-pgn-viewer)**
- **[npm package](https://www.npmjs.com/package/cm-pgn-viewer)**

It is built on [cm-chessboard](https://github.com/shaack/cm-chessboard) for the board and [cm-pgn](https://github.com/shaack/cm-pgn) for parsing, and it is the viewer for commented games in the forum of [chessmail.de](https://www.chessmail.de).

## Features

- Moves and comments as running text, comments in their own colour, every variation in its own block, nested variations inside their parent
- White and black moves look different: Black gets the darker piece icon and a darker tone
- The move shown is framed on the board, for an assessed move (`!!`, `!`, `!?`, `?!`, `?`, `??`) the frame has the colour of the assessment, the symbols in the notation the same colours
- A king in check gets a red circle
- The comment of a move as a speech bubble on the board, pointing to the piece and placed where it hides the fewest pieces. A click on the piece makes it small, a click on the piece or the small bubble big again
- Click a move, use the buttons (play, start, back, forward, end, flip) or the keys Left, Right, Home and End
- Move numbers from the FEN, so a game from a position starts at the right move, also with Black to move
- Chess960, detected from the `Variant` tag or from the start FEN, castling with Chess960 rules
- Piece icons (Font Awesome Free, solid or regular), unicode figurines or configurable piece letters (`K D T L S` for German, for example)
- The layout follows the width of the **container**, not of the window: side by side when there is room, stacked when the container is narrow
- A broken PGN shows an error message with the PGN instead of breaking the page
- "Show PGN" opens the PGN in a modal dialog with syntax highlighting and a copy button
- Lazy initialization for pages with many games
- Screen reader support: moves are announced in a live region, the board uses the cm-chessboard Accessibility extension

## Install

```sh
npm install cm-pgn-viewer
```

## Usage

Load the stylesheets of cm-chessboard and of the viewer. `markers.css` is needed for the markers, the colours of the assessments come with `cm-pgn-viewer.css`.

```html
<link rel="stylesheet" href="./node_modules/cm-chessboard/assets/chessboard.css"/>
<link rel="stylesheet" href="./node_modules/cm-chessboard/assets/extensions/markers/markers.css"/>
<link rel="stylesheet" href="./node_modules/cm-pgn-viewer/assets/cm-pgn-viewer.css"/>
```

Without a bundler, map the bare module names:

```html
<script type="importmap">
    {
        "imports": {
            "cm-chessboard/": "./node_modules/cm-chessboard/",
            "cm-pgn/": "./node_modules/cm-pgn/",
            "chess.mjs/": "./node_modules/chess.mjs/"
        }
    }
</script>
```

Create a viewer:

```html
<div id="viewer"></div>
<script type="module">
    import {PgnViewer} from "./node_modules/cm-pgn-viewer/src/PgnViewer.js"

    new PgnViewer(document.getElementById("viewer"), {
        pgn: `[White "Haack, Stefan"]
[Black "Maier, Karsten"]

1. e4 e5 2. Nf3 Nc6 (2... Nf6 {Petrov} 3. Nxe5) 3. Bb5 a6 *`,
        assetsUrl: "./node_modules/cm-chessboard/assets/"
    })
</script>
```

Or replace every `<pgn>` element of a page by a viewer. The text of the element is the PGN, `<br>` counts as a line break. With `lazy: true` a viewer is only built when it scrolls into view.

```js
PgnViewer.initFrom("pgn", {lazy: true, assetsUrl: "/node_modules/cm-chessboard/assets/"})
```

## Props

| Prop               | Default                                  | Description                                                                 |
|--------------------|------------------------------------------|-----------------------------------------------------------------------------|
| `pgn`              | `""`                                     | The PGN                                                                     |
| `lenient`          | `false`                                  | Repair hand typed PGNs: `0-0`, `1:0`, `½-½`, German piece letters, sloppy SAN |
| `chess960`         | `undefined`                              | `undefined` detects Chess960, `true` or `false` forces it                   |
| `orientation`      | `"w"`                                    | Board orientation                                                           |
| `boardTheme`       | `"default"`                              | cm-chessboard css class of the board                                        |
| `borderType`       | `"none"`                                 | Board border, `"none"`, `"thin"` or `"frame"` (wide, with the coordinates) |
| `piecesFile`       | `"pieces/standard.svg"`                  | cm-chessboard pieces sprite                                                 |
| `assetsUrl`        | `"./node_modules/cm-chessboard/assets/"` | Where the cm-chessboard assets are                                          |
| `notation`         | `"icons"`                                | `"icons"` (SVG piece icons), `"unicode"` (♞f3) or `"letters"` (Nf3)         |
| `iconStyle`        | `"auto"`                                 | `"auto"`: the darker icon for Black, in light mode solid, in dark mode regular (the outline looks darker on a dark ground). Or `"solid"`, `"regular"` |
| `pieceLetters`     | `{K: "K", Q: "Q", R: "R", B: "B", N: "N"}` | The letters for `notation: "letters"`                                     |
| `showHeaders`      | `true`                                   | Players, event, site, round, date, ECO, result                              |
| `showControls`     | `true`                                   | The button row                                                              |
| `showPgnToggle`    | `true`                                   | "Show PGN", opens the PGN highlighted in a modal dialog                     |
| `commentBubbles`   | `true`                                   | Show the comment of a move as speech bubble on the board                    |
| `bubbleExpanded`   | `true`                                   | Start with the big bubble, `false` for the small one                        |
| `lastMoveMarker`   | `MARKER_TYPE.frame`                      | Marker on both squares of the move shown, any cm-chessboard `MARKER_TYPE` (re-exported by `PgnViewer.js`), `null` for none |
| `qualityMarkers`   | `true`                                   | Moves with `!!`, `!`, `!?`, `?!`, `?` or `??` get the frame in the colour of their assessment |
| `checkMarker`      | `MARKER_TYPE.circleDanger`               | Marker on the king in check, `null` for none                                |
| `autoplayInterval` | `1000`                                   | Milliseconds per move when playing                                          |
| `initialPly`       | `undefined`                              | Show the position after this ply of the mainline on load                    |
| `accessibility`    | `true`                                   | Live region for moves and the cm-chessboard Accessibility extension         |
| `language`         | `"en"`                                   | `"en"` or `"de"`                                                            |
| `i18n`             | `{}`                                     | Override single labels, see `src/I18n.js`                                   |
| `icons`            | `{}`                                     | Override button icons with your own HTML, keys as in `ICONS`                |
| `onMoveSelect`     | `undefined`                              | `(move) => {}`, `move` is `undefined` for the start position                |

## Chess piece icons

`src/PieceIcons.js` is a small icon set of the six chess pieces in two styles, usable without the viewer. The icons share one baseline and scale, and they are filled with `currentColor`.

```js
import {pieceIcon} from "cm-pgn-viewer/src/PieceIcons.js"

element.innerHTML = pieceIcon("n")                                // solid knight, aria-hidden
element.innerHTML = pieceIcon("Q", "regular", {class: "icon", "aria-label": "queen"})
```

Size them with CSS, e.g. `svg.icon {height: 1em; width: auto}`. For a fixed width like `fa-fw`, give them the width of the widest icon, the queen: `svg.icon {height: 1em; width: calc(1em * 512 / 544)}`, the narrower pieces are centred.

## PGN syntax highlighting

`src/PgnHighlighter.js` turns PGN text into HTML with a span per token (`pgn-tag-name`, `pgn-tag-value`, `pgn-number`, `pgn-move`, `pgn-comment`, `pgn-variation`, `pgn-nag`, `pgn-result`), usable without the viewer.

```js
import {highlightPgn} from "cm-pgn-viewer/src/PgnHighlighter.js"

pre.innerHTML = highlightPgn(pgn)
```

## Methods

`goToMove(move)`, `first()`, `previous()`, `next()`, `last()`, `flip()`, `play()`, `stop()`, `showPgn()`, `setCommentBubbles(on)`, `destroy()`. `next()` and `last()` follow the line of the move shown, so inside a variation they stay in the variation.

## Layout and theming

The viewer is a CSS container. Below a container width of 36rem the notation is placed below the board. From 36rem board and notation stand side by side, the notation exactly as high as the board. Up to 40rem they share the width 50/50, from there the board grows evenly to the golden ratio at 60rem (`--pgn-viewer-board-ratio`, 0.618). The board stops growing at `--pgn-viewer-board-max` (40rem), the notation takes the rest. Colours, font weights, sizes, radius and gap are custom properties on `.cm-pgn-viewer`, see `assets/cm-pgn-viewer.css`. Dark mode follows `prefers-color-scheme` and `data-bs-theme="dark"`.

## Demo and tests

Serve the project root with any static HTTP server and open `index.html` for the demo or `test/index.html` for the tests. `npm test` runs the tests headless with [Teevi](https://github.com/shaack/teevi), it needs a global puppeteer.

## License

MIT, see [LICENSE](LICENSE).

The chess piece icons in `src/PieceIcons.js` are from [Font Awesome Free](https://fontawesome.com) 7.3.1 by Fonticons, Inc. and licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The paths are unchanged, only the viewBox is adjusted.
