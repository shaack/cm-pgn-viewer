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

function clickSquare(viewer, square) {
    const view = viewer.board.view
    const rect = viewer.elements.board.getBoundingClientRect()
    const point = view.squareToPoint(square)
    viewer.elements.board.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        clientX: rect.left + point.x + view.squareWidth / 2,
        clientY: rect.top + point.y + view.squareHeight / 2
    }))
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

    it("should frame assessed moves in the colour of their assessment", () => {
        const viewer = createViewer(`1. e4 e5 $2 2. Nf3 $4 Nc6 $3 *`, {language: "de"})
        const frames = () => JSON.stringify(viewer.board.getMarkers()
            .filter(marker => marker.type.slice === "markerFrame")
            .map(marker => marker.square + ":" + marker.type.class))
        viewer.next()
        assert.equal(frames(), JSON.stringify(["e2:marker-frame", "e4:marker-frame"]))
        viewer.next()
        assert.equal(frames(), JSON.stringify(["e7:marker-pgn-mistake", "e5:marker-pgn-mistake"]))
        viewer.next()
        assert.equal(frames(), JSON.stringify(["g1:marker-pgn-blunder", "f3:marker-pgn-blunder"]))
        assert.equal(viewer.elements.live.textContent, "2. Weiß: Springer f3, grober Fehler")
        viewer.next()
        assert.equal(frames(), JSON.stringify(["b8:marker-pgn-brilliant", "c6:marker-pgn-brilliant"]))
        viewer.first()
        assert.equal(frames(), "[]")
        // the same colours for the symbols in the notation
        assert.equal(viewer.elements.notation.querySelectorAll(".nag-mistake, .nag-blunder, .nag-brilliant").length, 3)
        viewer.destroy()
        const plain = createViewer(`1. e4 $1 *`, {qualityMarkers: false})
        plain.next()
        assert.equal(plain.board.getMarkers(MARKER_TYPE.frame).length, 2)
        plain.destroy()
    })

    it("should mark the target of a capture with the capture marker", () => {
        const viewer = createViewer(`1. e4 d5 2. exd5 $2 Qxd5 3. a4 e5 4. a5 b5 5. axb6 *`)
        const markers = () => JSON.stringify(viewer.board.getMarkers().map(marker => marker.square + ":" + marker.type.class))
        viewer.goToMove(viewer.history[2], false) // exd5?
        assert.equal(markers(), JSON.stringify(["e4:marker-pgn-mistake", "d5:marker-pgn-mistake marker-pgn-capture"]))
        viewer.next() // Qxd5
        assert.equal(markers(), JSON.stringify(["d8:marker-frame", "d5:marker-bevel"]))
        viewer.next() // a4, no capture
        assert.equal(markers(), JSON.stringify(["a2:marker-frame", "a4:marker-frame"]))
        viewer.last() // axb6 en passant
        assert.equal(markers(), JSON.stringify(["a5:marker-frame", "b6:marker-bevel"]))
        viewer.destroy()
        const frames = createViewer(`1. e4 d5 2. exd5 *`, {captureMarker: null})
        frames.last()
        assert.equal(JSON.stringify(frames.board.getMarkers().map(marker => marker.square + ":" + marker.type.class)),
            JSON.stringify(["e4:marker-frame", "d5:marker-frame"]))
        frames.destroy()
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

    it("should show the PGN highlighted in a modal dialog", () => {
        const viewer = createViewer(PGN, {language: "de"})
        const dialog = viewer.elements.dialog
        assert.false(dialog.open)
        viewer.elements.source.querySelector("[data-action=showPgn]").click()
        assert.true(dialog.open)
        assert.equal(dialog.querySelector(".pgn-tag-name").textContent, "White")
        assert.true(dialog.querySelectorAll(".pgn-move").length > 0)
        dialog.querySelector("[data-action=closePgn]").click()
        assert.false(dialog.open)
        viewer.destroy()
    })

    it("should show the comment of a move as bubble on the board", () => {
        const viewer = createViewer(`1. e4 {Best by test [%clk 0:05:00]} e5 2. Nf3 *`)
        viewer.next()
        assert.false(viewer.bubble.element.hidden) // on by default
        assert.false(viewer.bubble.collapsed) // and big
        assert.equal(viewer.bubble.text.textContent, "Best by test")
        viewer.next()
        assert.true(viewer.bubble.element.hidden) // e5 has no comment
        viewer.previous()
        assert.false(viewer.bubble.element.hidden)
        viewer.setCommentBubbles(false)
        assert.true(viewer.bubble.element.hidden)
        viewer.destroy()
        const off = createViewer(`1. e4 {Best} *`, {initialPly: 1, commentBubbles: false})
        assert.equal(off.bubble, undefined)
        off.destroy()
    })

    it("should make the bubble small on a click on the piece, big again on the piece or the small bubble", () => {
        const viewer = createViewer(`1. e4 {Best} e5 {Also good} *`, {initialPly: 1})
        const bubble = viewer.bubble
        assert.false(bubble.collapsed)
        bubble.element.click()
        assert.false(bubble.collapsed) // a click on the big bubble does nothing
        clickSquare(viewer, "e4")
        assert.true(bubble.collapsed)
        assert.true(bubble.element.classList.contains("collapsed"))
        bubble.element.click()
        assert.false(bubble.collapsed) // the small bubble opens it
        clickSquare(viewer, "e4")
        // stays small on the next move
        viewer.next()
        assert.true(bubble.collapsed)
        assert.equal(bubble.square, "e5")
        // a click on the piece on e5 makes it big
        clickSquare(viewer, "e5")
        assert.false(bubble.collapsed)
        // and small again
        clickSquare(viewer, "e5")
        assert.true(bubble.collapsed)
        viewer.destroy()
    })

    it("should place the bubble where it hides the fewest pieces", () => {
        // the queen goes to d5, above it three full ranks, below it empty squares
        const crowdedAbove = createViewer(`[SetUp "1"]
[FEN "rnbqkbnr/pppppppp/pppppppp/8/8/8/8/3QK3 w kq - 0 1"]

1. Qd5 {Into the middle} *`, {initialPly: 1, bubbleExpanded: true})
        assert.true(crowdedAbove.bubble.element.classList.contains("below"))
        crowdedAbove.destroy()
        // free squares above, pawns below: the bubble stays above
        const freeAbove = createViewer(`[SetUp "1"]
[FEN "4k3/8/8/8/3Q4/PPPPPPPP/PPPPPPPP/4K3 w - - 0 1"]

1. Qd5 {Into the middle} *`, {initialPly: 1, bubbleExpanded: true})
        assert.false(freeAbove.bubble.element.classList.contains("below"))
        freeAbove.destroy()
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
