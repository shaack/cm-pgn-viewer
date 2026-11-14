/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 */
import {describe, it, assert} from "teevi/src/teevi.js"
import {materialBalance} from "../src/Material.js"
import {START_FEN} from "../src/PgnLoader.js"

const json = (value) => JSON.stringify(value)

describe("Material", () => {

    it("should find the captured pieces and the advantage", () => {
        // after 1. e4 d5 2. exd5 Qxd5 3. Nc3 Qxg2: White lost two pawns, Black one
        const balance = materialBalance(START_FEN, "rnb1kbnr/ppp1pppp/8/8/8/2N5/PPPP1PqP/R1BQKBNR w KQkq - 0 4")
        assert.equal(json(balance.capturedByWhite), json(["p"]))
        assert.equal(json(balance.capturedByBlack), json(["p", "p"]))
        assert.equal(balance.advantage, -1)
    })

    it("should sort the captured pieces by value", () => {
        const balance = materialBalance(START_FEN, "1nb1kbn1/pppppppp/8/8/8/8/PPPPPPP1/RNBQKBN1 w - - 0 1")
        assert.equal(json(balance.capturedByWhite), json(["q", "r", "r"]))
        assert.equal(json(balance.capturedByBlack), json(["r", "p"]))
        assert.equal(balance.advantage, 13)
    })

    it("should compare with the start position of the game, not the standard one", () => {
        const start = "4k3/pp6/8/8/8/8/PPP5/4K2R w K - 0 1"
        const balance = materialBalance(start, "4k3/p7/8/8/8/8/PPP5/4K2R b K - 0 1")
        assert.equal(json(balance.capturedByWhite), json(["p"]))
        assert.equal(json(balance.capturedByBlack), json([]))
        assert.equal(balance.advantage, 7) // rook and two pawns more
    })

    it("should not count a promoted pawn as captured", () => {
        const balance = materialBalance("4k3/P7/8/8/8/8/8/4K3 w - - 0 1", "Q3k3/8/8/8/8/8/8/4K3 b - - 0 1")
        assert.equal(json(balance.capturedByBlack), json(["p"])) // the pawn is gone, no capture of the queen
        assert.equal(balance.advantage, 9)
    })
})
