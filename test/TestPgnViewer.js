/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 */
import {describe, it, assert} from "teevi/src/teevi.js"
import {PgnViewer, MARKER_TYPE} from "../src/PgnViewer.js"

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
