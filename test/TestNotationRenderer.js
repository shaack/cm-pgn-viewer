/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 */
import {describe, it, assert} from "teevi/src/teevi.js"
import {loadPgn} from "../src/PgnLoader.js"
import {NotationRenderer} from "../src/NotationRenderer.js"

function render(pgn, props = {}) {
    const loaded = loadPgn(pgn)
    const container = document.createElement("div")
    const renderer = new NotationRenderer(props)
    renderer.render(container, loaded.pgn.history.moves, loaded.pgn.history.gameComment)
    return container
}

function assertTexts(elements, expected) {
    assert.equal(JSON.stringify(Array.from(elements).map(element => element.textContent.trim())), JSON.stringify(expected))
}

describe("NotationRenderer", () => {

    it("should number black moves only at line starts and after comments or variations", () => {
        const container = render(`1. e4 e5 {comment} 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 *`, {notation: "letters"})
        assertTexts(container.querySelectorAll(":scope > .move"),
            ["1.e4", "e5", "2.Nf3", "Nc6", "3.Bb5"])
        assertTexts(container.querySelectorAll(".variation .move"), ["2…d6", "3.d4"])
        const afterComment = render(`1. e4 {comment} e5 *`, {notation: "letters"})
        assertTexts(afterComment.querySelectorAll(".move"), ["1.e4", "1…e5"])
    })

    it("should take the move numbers from the FEN", () => {
        const container = render(`[SetUp "1"]\n[FEN "3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 23"]\n\n23... Rd2 (23... h6 24. h3) 24. f3 Kf8 *`,
            {notation: "letters"})
        assertTexts(container.querySelectorAll(".move"), ["23…Rd2", "23…h6", "24.h3", "24.f3", "Kf8"])
    })

    it("should render variations as nested blocks", () => {
        const container = render(`1. e4 e5 (1... c5 2. Nf3 (2. c3 d5) 2... d6) 2. Nf3 *`)
        const outer = container.querySelector(":scope > .variation")
        assert.true(!!outer)
        assert.true(!!outer.querySelector(":scope > .variation"))
        assertTexts(outer.querySelectorAll(":scope > .variation .move"), ["2.c3", "d5"])
    })

    it("should render comments, the game comment and NAGs, without embedded commands", () => {
        const container = render(`{Game comment} 1. e4 $1 {Best [%clk 0:05:00]} e5 $6 *`)
        assertTexts(container.querySelectorAll(".comment"), ["Game comment", "Best"])
        assertTexts(container.querySelectorAll(".nag"), ["!", "?!"])
    })

    it("should lead from a comment to its move, from the game comment to the start position", () => {
        const loaded = loadPgn(`{Game} 1. e4 {After e4} e5 (1... {Before c5} c5) *`)
        const container = document.createElement("div")
        const renderer = new NotationRenderer()
        renderer.render(container, loaded.pgn.history.moves, loaded.pgn.history.gameComment)
        const comments = container.querySelectorAll(".comment")
        assert.equal(renderer.commentMoveFromElement(comments[0]), null)
        assert.equal(renderer.commentMoveFromElement(comments[1]).san, "e4")
        assert.equal(renderer.commentMoveFromElement(comments[2]).san, "c5")
        assert.equal(renderer.commentMoveFromElement(container.querySelector(".move")), undefined)
    })

    it("should format pieces as SVG icons, unicode or configurable letters", () => {
        const withIcons = render(`1. Nf3 d5 2. g3 c5 3. Bg2 Nc6 4. O-O e5 *`, {pieceNames: {n: "knight", b: "bishop"}})
        // "auto" renders both styles, the stylesheet picks one by side and colour scheme
        assert.equal(withIcons.querySelectorAll(".move svg.piece-icon.auto.solid").length, 3)
        assert.equal(withIcons.querySelectorAll(".move svg.piece-icon.auto.regular").length, 3)
        const icons = withIcons.querySelectorAll(".move svg.piece-icon.solid")
        assert.equal(icons[0].getAttribute("aria-label"), "knight")
        assert.equal(icons[0].parentElement.lastChild.textContent, "f3")
        assert.equal(withIcons.querySelector(".move").textContent, "1.f3") // the icon has no text
        // every move knows its side, the stylesheet colours it
        assert.true(withIcons.querySelectorAll(".move")[0].classList.contains("white"))
        assert.true(withIcons.querySelectorAll(".move")[5].classList.contains("black"))
        assert.equal(withIcons.querySelector(".move svg.piece-icon.regular").getAttribute("viewBox"), "0 -32 448 544")
        const solid = render(`1. Nf3 *`, {iconStyle: "solid"})
        assert.equal(solid.querySelector("svg.piece-icon").getAttribute("viewBox"), "0 -32 384 544")
        assert.equal(solid.querySelectorAll("svg.piece-icon").length, 1)
        assert.false(solid.querySelector("svg.piece-icon").classList.contains("auto"))
        const unicode = render(`1. Nf3 *`, {notation: "unicode"})
        assert.equal(unicode.querySelector(".san").textContent, "\u265E\uFE0Ef3")
        const letters = render(`1. Nf3 d5 2. g3 c5 3. Bg2 Nc6 4. O-O *`,
            {notation: "letters", pieceLetters: {K: "K", Q: "D", R: "T", B: "L", N: "S"}})
        assertTexts(letters.querySelectorAll(".san"), ["Sf3", "d5", "g3", "c5", "Lg2", "Sc6", "O-O"])
        const renderer = new NotationRenderer({notation: "letters", pieceLetters: {K: "K", Q: "D", R: "T", B: "L", N: "S"}})
        assert.equal(renderer.formatSan("exd8=Q+"), "exd8=D+")
    })
})
