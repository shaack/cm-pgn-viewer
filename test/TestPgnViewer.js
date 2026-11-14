/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 */
import {describe, it, assert} from "teevi/src/teevi.js"
import {PgnViewer, MARKER_TYPE, kingSquare} from "../src/PgnViewer.js"

const assetsUrl = "../node_modules/cm-chessboard/assets/"

function createViewer(pgn, props = {}) {
    const container = document.createElement("div")
    document.getElementById("viewers").appendChild(container)
    return new PgnViewer(container, {pgn, assetsUrl, ...props})
}

const PGN = `[White "Haack, Stefan"]
[Black "Maier, Karsten"]
[Event "Test"]
[Date "1989.??.??"]

1. e4 e5 2. Nf3 (2. f4 exf4) 2... Nc6 3. Bb5 *`

describe("PgnViewer", () => {

    it("should navigate along the mainline and into variations", () => {
        const viewer = createViewer(PGN)
        assert.equal(viewer.currentMove, undefined)
        viewer.next()
        viewer.next()
        assert.equal(viewer.currentMove.san, "e5")
        viewer.last()
        assert.equal(viewer.currentMove.san, "Bb5")
        const f4 = viewer.notationRenderer.moves.find(move => move.san === "f4")
        viewer.goToMove(f4, false)
        viewer.next()
        assert.equal(viewer.currentMove.san, "exf4")
        assert.true(viewer.notationRenderer.moveToElement.get(viewer.currentMove).classList.contains("active"))
        viewer.previous()
        viewer.previous()
        assert.equal(viewer.currentMove.san, "e5") // back to the move before the branch
        viewer.first()
        assert.equal(viewer.currentMove, undefined)
        viewer.destroy()
    })

    it("should jump to a move on click and update the controls", () => {
        const viewer = createViewer(PGN)
        const controls = viewer.elements.controls
        assert.true(controls.querySelector("[data-action=previous]").disabled)
        const moveElement = Array.from(viewer.elements.notation.querySelectorAll(".move"))
            .find(element => element.textContent.includes("c6"))
        moveElement.click()
        assert.equal(viewer.currentMove.san, "Nc6")
        assert.false(controls.querySelector("[data-action=previous]").disabled)
        controls.querySelector("[data-action=last]").click()
        assert.true(controls.querySelector("[data-action=next]").disabled)
        viewer.destroy()
    })

    it("should render the headers and a badge for Chess960", () => {
        const viewer = createViewer(PGN)
        assert.equal(viewer.elements.headers.querySelector(".players").textContent, "Haack, Stefan – Maier, Karsten")
        assert.equal(viewer.elements.headers.querySelector(".meta").textContent, "Test | 1989")
        viewer.destroy()
        const chess960 = createViewer(`[SetUp "1"]\n[FEN "rkrbbnnq/pppppppp/8/8/8/8/PPPPPPPP/RKRBBNNQ w KQkq - 0 1"]\n\n1. g3 *`,
            {language: "de"})
        assert.equal(chess960.elements.headers.querySelector(".badge").textContent, "Schach960")
        chess960.destroy()
    })

    it("should show an error and not throw for a broken PGN", () => {
        const viewer = createViewer(`1. e4 e5 2. Nf6 *`, {language: "de"})
        assert.equal(viewer.context.querySelector(".pgn-viewer-error .message").textContent, "Ungültiger Zug: Nf6")
        viewer.next()
        viewer.last()
        viewer.play()
        viewer.flip()
        viewer.destroy()
    })

    it("should start at initialPly and announce moves", () => {
        const viewer = createViewer(PGN, {initialPly: 3})
        assert.equal(viewer.currentMove.san, "Nf3")
        viewer.next()
        assert.equal(viewer.elements.live.textContent, "2. Black: knight c6")
        viewer.destroy()
    })

    it("should show an arrow in the colour of the assessment, only for assessed moves", () => {
        const viewer = createViewer(`1. e4 e5 $2 2. Nf3 $4 Nc6 $3 *`, {language: "de"})
        const arrows = () => JSON.stringify(viewer.board.getArrows().map(arrow => arrow.from + arrow.to + ":" + arrow.type.class))
        viewer.next()
        assert.equal(arrows(), "[]") // no assessment, no arrow
        viewer.next()
        assert.equal(arrows(), JSON.stringify(["e7e5:arrow-pgn-mistake"]))
        viewer.next()
        assert.equal(arrows(), JSON.stringify(["g1f3:arrow-pgn-blunder"]))
        assert.equal(viewer.elements.live.textContent, "2. Weiß: Springer f3, grober Fehler")
        viewer.next()
        assert.equal(arrows(), JSON.stringify(["b8c6:arrow-pgn-brilliant"]))
        viewer.first()
        assert.equal(arrows(), "[]")
        // the same colours for the symbols in the notation
        assert.equal(viewer.elements.notation.querySelectorAll(".nag-mistake, .nag-blunder, .nag-brilliant").length, 3)
        viewer.destroy()
        const none = createViewer(`1. e4 $1 *`, {qualityArrows: false})
        none.next()
        assert.equal(none.board.getArrows().length, 0)
        none.destroy()
    })

    it("should mark the king in check", () => {
        const viewer = createViewer(`1. e4 f5 2. Qh5+ g6 *`)
        const marked = () => JSON.stringify(viewer.board.getMarkers(MARKER_TYPE.circleDanger).map(marker => marker.square))
        viewer.next()
        viewer.next()
        assert.equal(marked(), "[]")
        viewer.next()
        assert.equal(marked(), JSON.stringify(["e8"]))
        viewer.next()
        assert.equal(marked(), "[]")
        viewer.destroy()
        assert.equal(kingSquare("rnbqkbnr/ppppp2p/6p1/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2"), "e8")
        assert.equal(kingSquare("8/8/8/8/8/8/8/6K1 w - - 0 1"), "g1")
    })

    it("should mark the last move with the lastMoveMarker", () => {
        const viewer = createViewer(PGN)
        viewer.next()
        const squares = (type) => JSON.stringify(viewer.board.getMarkers(type).map(marker => marker.square).sort())
        assert.equal(squares(MARKER_TYPE.frame), JSON.stringify(["e2", "e4"]))
        viewer.next()
        assert.equal(squares(MARKER_TYPE.frame), JSON.stringify(["e5", "e7"]))
        viewer.first()
        assert.equal(viewer.board.getMarkers(MARKER_TYPE.frame).length, 0)
        viewer.destroy()
        const square = createViewer(PGN, {lastMoveMarker: MARKER_TYPE.square})
        square.next()
        assert.equal(square.board.getMarkers(MARKER_TYPE.square).length, 2)
        assert.equal(square.board.getMarkers(MARKER_TYPE.frame).length, 0)
        square.destroy()
        const none = createViewer(PGN, {lastMoveMarker: null})
        none.next()
        assert.equal(none.board.getMarkers().length, 0)
        none.destroy()
    })

    it("should replace elements with viewers in initFrom", () => {
        const holder = document.createElement("div")
        holder.innerHTML = `<pgn>[White "A"]<br />[Black "B"]<br /><br />1. e4 e5 *</pgn><pgn>1. d4 *</pgn>`
        document.getElementById("viewers").appendChild(holder)
        const viewers = PgnViewer.initFrom(holder.querySelectorAll("pgn"), {assetsUrl})
        assert.equal(viewers.length, 2)
        assert.equal(holder.querySelectorAll("pgn").length, 0)
        assert.equal(viewers[0].history.length, 2)
        viewers.forEach(viewer => viewer.destroy())
        holder.remove()
    })
})
