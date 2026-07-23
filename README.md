# cm-pgn-viewer

A PGN viewer for the web, written in vanilla ES6. It handles **variations, NAGs and
comments** and renders a clickable game notation next to an SVG chessboard.

- **[Repository](https://github.com/shaack/cm-pgn-viewer)**
- **[npm package](https://www.npmjs.com/package/cm-pgn-viewer)**

## It uses

- [cm-chess](https://github.com/shaack/cm-chess) An ES6 wrapper around chess.js and
  [cm-pgn](https://github.com/shaack/cm-pgn), parses PGNs with variations, NAGs and comments
- [cm-chessboard](https://github.com/shaack/cm-chessboard) The board, rendered in SVG, ES6 module
- [cm-web-modules](https://github.com/shaack/cm-web-modules) ES6 toolbox for building web applications

No jQuery, no framework, no build step. The control buttons use
[Font Awesome Free](https://fontawesome.com/) icons, so the embedding page must load
Font Awesome Free (the demo loads it from `node_modules`).

## Install

```sh
npm install
```

Then serve the project root with any static HTTP server and open `/index.html` to see a
working viewer with a sample game.

## Usage

```html
<div class="my-viewer"></div>
<script type="module">
    import {PgnViewer} from "./src/PgnViewer.js"
    new PgnViewer(document.querySelector(".my-viewer"), {
        pgn: `[White "Haack, Stefan"]
[Black "Maier, Karsten"]

1. e4 e5 2. Nf3 Nc6 (2... Nf6 {Petrov} 3. Nxe5) 3. Bb5 a6 *`
    })
</script>
```

### Props

| Prop           | Default                    | Description                                             |
|----------------|----------------------------|---------------------------------------------------------|
| `pgn`          | `undefined`                | The PGN string to display                               |
| `orientation`  | `"w"`                      | Board orientation, `"w"` or `"b"`                       |
| `boardTheme`   | `"default"`                | cm-chessboard css theme                                 |
| `piecesFile`   | `"pieces/standard.svg"`    | cm-chessboard pieces sprite                             |
| `assetsUrl`    | `"./node_modules/cm-chessboard/assets/"` | Where cm-chessboard assets live         |
| `notationType` | `"figures"`                | `"figures"` (unicode piece glyphs) or `"san"`           |
| `showHeaders`  | `true`                     | Show the White/Black/Result header line                 |
| `showControls` | `true`                     | Show the first/previous/next/last/flip button row       |
| `markLastMove` | `true`                     | Highlight the from/to squares of the viewed move        |
| `initialPly`   | `undefined`                | Jump to this ply on load; default is the start position |
| `icons`        | Font Awesome classes       | Override control icons, e.g. `{next: "fa-solid fa-angle-right"}` |
| `i18n`         | English labels             | Override control button titles / aria-labels            |
| `onMoveSelect` | `undefined`                | Callback `(move) => {}` when a move becomes active       |

### Convenience: initialise many viewers at once

`PgnViewer.initFrom(selector)` reads the text content of every matching element as a PGN
and replaces it with a viewer. Handy for rendering games inline in forum posts or articles.

```js
PgnViewer.initFrom("pgn") // replaces every <pgn>…</pgn> element on the page
```

## License

MIT, see [LICENSE](LICENSE)
