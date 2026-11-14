/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * The move assessments of the PGN standard ($1 to $6). They colour the arrow
 * of the move on the board and the symbol in the notation, see the classes
 * in assets/cm-pgn-viewer.css.
 */
export const MOVE_QUALITY = {
    1: "good",          // !
    2: "mistake",       // ?
    3: "brilliant",     // !!
    4: "blunder",       // ??
    5: "interesting",   // !?
    6: "dubious"        // ?!
}

// cm-chessboard Arrows types, the class defines the colour
export const MOVE_ARROW_TYPE = {
    good: {class: "arrow-pgn-good"},
    mistake: {class: "arrow-pgn-mistake"},
    brilliant: {class: "arrow-pgn-brilliant"},
    blunder: {class: "arrow-pgn-blunder"},
    interesting: {class: "arrow-pgn-interesting"},
    dubious: {class: "arrow-pgn-dubious"}
}

/** "good", "mistake", ... or undefined, if the move has no assessment */
export function moveQuality(move) {
    for (const nag of (move && move.nags) || []) {
        if (MOVE_QUALITY[nag]) {
            return MOVE_QUALITY[nag]
        }
    }
    return undefined
}
