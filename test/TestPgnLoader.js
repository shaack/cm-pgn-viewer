/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 */
import {describe, it, assert} from "teevi/src/teevi.js"
import {loadPgn, normalizePgn, detectChess960, readPgnFromElement, VARIANT, START_FEN} from "../src/PgnLoader.js"

describe("PgnLoader", () => {

    it("should put headers on their own lines and separate the movetext", () => {
        assert.equal(normalizePgn(`[White "A"] [Black "B"] 1. e4 e5 *`), `[White "A"]\n[Black "B"]\n\n1. e4 e5 *`)
        assert.equal(normalizePgn(`  1. e4 e5 *  `), `1. e4 e5 *`)
        assert.equal(normalizePgn(`    [White "A"]\n    1. e4 {indented\n        comment} e5 *\n`), `[White "A"]\n\n1. e4 {indented\ncomment} e5 *`)
    })

    it("should repair hand typed PGNs in lenient mode, but not inside comments", () => {
        assert.equal(normalizePgn(`1. e4 e5 2. Sf3 Sc6 3. Lb5 a6 4. 0-0 {0-0 und Sf3} Sf6 1:0`, true),
            `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O {0-0 und Sf3} Nf6 1-0`)
        assert.equal(normalizePgn(`1. Dxd8+ Kxd8 2. 0-0-0+ ½-½`, true), `1. Qxd8+ Kxd8 2. O-O-O+ 1/2-1/2`)
        assert.equal(normalizePgn(`1. a8=D 0:1`, true), `1. a8=Q 0-1`)
        // without lenient nothing changes
        assert.equal(normalizePgn(`1. e4 e5 2. Sf3 *`), `1. e4 e5 2. Sf3 *`)
    })

    it("should read a PGN from an element with <br> and escaped HTML", () => {
        const element = document.createElement("pgn")
        element.innerHTML = `[White "A &amp; B"]<br />[Black "C"]<br /><br />1. e4 {&lt;!&gt;} e5 *`
        assert.equal(readPgnFromElement(element), `[White "A & B"]\n[Black "C"]\n\n1. e4 {<!>} e5 *`)
    })

    it("should detect Chess960 from the castling rights of the start FEN", () => {
        assert.false(detectChess960(START_FEN))
        assert.true(detectChess960("rkrbbnnq/pppppppp/8/8/8/8/PPPPPPPP/RKRBBNNQ w KQkq - 0 1"))
        // a Chess960 start position without castling rights plays like standard chess
        assert.false(detectChess960("rkrbbnnq/pppppppp/8/8/8/8/PPPPPPPP/RKRBBNNQ w - - 0 1"))
        // only one side with an unusual rook
        assert.true(detectChess960("r3k2r/8/8/8/8/8/8/1R2K2R w Kkq - 0 1") === false)
        assert.true(detectChess960("r3k2r/8/8/8/8/8/8/1R2K2R w KQkq - 0 1"))
    })

    it("should load Chess960 with and without Variant tag", () => {
        const fen = "1k1r4/pppppppp/8/8/8/8/PPPPPPPP/1K1R4 w KQkq - 0 1"
        const withoutTag = loadPgn(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. O-O O-O 2. a3 *`)
        assert.equal(withoutTag.variant, VARIANT.chess960)
        assert.equal(withoutTag.error, undefined)
        assert.equal(withoutTag.pgn.history.moves[1].fen, "5rk1/pppppppp/8/8/8/8/PPPPPPPP/5RK1 w - - 2 2")
        const withTag = loadPgn(`[Variant "Chess960"]\n[SetUp "1"]\n[FEN "${fen}"]\n\n1. O-O *`)
        assert.equal(withTag.variant, VARIANT.chess960)
        const forcedOff = loadPgn(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. O-O *`, {chess960: false})
        assert.equal(forcedOff.error.type, "illegalMove")
    })

    it("should load a game from a position", () => {
        const loaded = loadPgn(`[SetUp "1"]\n[FEN "3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 23"]\n\n23... Rd2 24. f3 *`)
        assert.equal(loaded.variant, VARIANT.position)
        assert.equal(loaded.setUpFen, "3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 23")
        assert.equal(loaded.pgn.history.moves.length, 2)
        assert.equal(loadPgn(`1. e4 *`).variant, VARIANT.standard)
    })

    it("should report errors instead of throwing", () => {
        const illegal = loadPgn(`1. e4 e5 2. Nf6 *`)
        assert.equal(illegal.error.type, "illegalMove")
        assert.equal(illegal.error.notation, "Nf6")
        const syntax = loadPgn(`1. e4 e5 2. {open comment Nf3 *`)
        assert.equal(syntax.error.type, "syntax")
    })
})
