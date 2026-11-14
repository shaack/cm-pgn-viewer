/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * The material balance of a position compared to the start position of the
 * game, so it also works for games from a position and for Chess960.
 */
export const PIECE_VALUES = {q: 9, r: 5, b: 3, n: 3, p: 1}
const ORDER = ["q", "r", "b", "n", "p"]

function countPieces(fen) {
    const counts = {w: {q: 0, r: 0, b: 0, n: 0, p: 0}, b: {q: 0, r: 0, b: 0, n: 0, p: 0}}
    for (const char of fen.split(/\s+/)[0]) {
        const type = char.toLowerCase()
        if (type in PIECE_VALUES) {
            counts[char === type ? "b" : "w"][type]++
        }
    }
    return counts
}

/**
 * @returns {{capturedByWhite: string[], capturedByBlack: string[], advantage: number}}
 *  the types of the captured pieces ("q", "r", ...), most valuable first, and the
 *  material advantage of White in pawns (negative: Black is ahead)
 */
export function materialBalance(startFen, fen) {
    const start = countPieces(startFen)
    const now = countPieces(fen)
    const captured = (color) => {
        const types = []
        for (const type of ORDER) {
            // a promotion adds a piece, so never below zero
            for (let i = 0; i < Math.max(0, start[color][type] - now[color][type]); i++) {
                types.push(type)
            }
        }
        return types
    }
    const value = (color) => ORDER.reduce((sum, type) => sum + now[color][type] * PIECE_VALUES[type], 0)
    return {
        capturedByWhite: captured("b"),
        capturedByBlack: captured("w"),
        advantage: value("w") - value("b")
    }
}
