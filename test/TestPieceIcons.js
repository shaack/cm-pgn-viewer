/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 */
import {describe, it, assert} from "teevi/src/teevi.js"
import {pieceIcon, PIECE_ICONS} from "../src/PieceIcons.js"

describe("PieceIcons", () => {

    it("should have all six pieces in both styles", () => {
        for (const style of ["solid", "regular"]) {
            assert.equal(Object.keys(PIECE_ICONS[style]).sort().join(""), "bknpqr")
        }
    })

    it("should create an SVG on a common baseline", () => {
        const holder = document.createElement("div")
        holder.innerHTML = pieceIcon("N") + pieceIcon("q", "regular", {class: "x", "aria-label": "Dame"})
        const [knight, queen] = holder.querySelectorAll("svg")
        assert.equal(knight.getAttribute("viewBox"), "0 -32 384 544")
        assert.equal(knight.getAttribute("aria-hidden"), "true")
        assert.equal(queen.getAttribute("viewBox"), "0 -32 512 544")
        assert.equal(queen.getAttribute("role"), "img")
        assert.equal(queen.getAttribute("aria-label"), "Dame")
        assert.equal(queen.getAttribute("class"), "x")
        assert.equal(pieceIcon("x"), "")
    })
})
