/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 */
import {describe, it, assert} from "teevi/src/teevi.js"
import {highlightPgn} from "../src/PgnHighlighter.js"

function tokens(pgn) {
    const holder = document.createElement("pre")
    holder.innerHTML = highlightPgn(pgn)
    return {
        holder,
        texts: (selector) => JSON.stringify(Array.from(holder.querySelectorAll(selector)).map(element => element.textContent))
    }
}

describe("PgnHighlighter", () => {

    it("should keep the text unchanged", () => {
        const pgn = `[White "A <b> & B"]\n[Black "C"]\n\n1. e4 {a <comment>} e5! (1... c5 $2) 2. Nf3 1-0`
        assert.equal(tokens(pgn).holder.textContent, pgn)
    })

    it("should mark headers, numbers, moves, comments, variations, NAGs and the result", () => {
        const {texts} = tokens(`[Event "Test"]\n\n1. e4 {Best} e5?! (1... c5 $2 2. Nf3) 2. O-O+ 1/2-1/2`)
        assert.equal(texts(".pgn-tag-name"), JSON.stringify(["Event"]))
        assert.equal(texts(".pgn-tag-value"), JSON.stringify(['"Test"']))
        assert.equal(texts(".pgn-number"), JSON.stringify(["1.", "1...", "2.", "2."]))
        assert.equal(texts(".pgn-move"), JSON.stringify(["e4", "e5", "c5", "Nf3", "O-O+"]))
        assert.equal(texts(".pgn-comment"), JSON.stringify(["{Best}"]))
        assert.equal(texts(".pgn-variation"), JSON.stringify(["(", ")"]))
        assert.equal(texts(".pgn-nag"), JSON.stringify(["?!", "$2"]))
        assert.equal(texts(".nag-dubious"), JSON.stringify(["?!"]))
        assert.equal(texts(".nag-mistake"), JSON.stringify(["$2"]))
        assert.equal(texts(".pgn-result"), JSON.stringify(["1/2-1/2"]))
    })
})
