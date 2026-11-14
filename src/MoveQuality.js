/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * The move assessments of the PGN standard ($1 to $6). They colour the frame
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

// cm-chessboard marker types, the frame of MARKER_TYPE.frame, the class defines the colour
export const MOVE_MARKER_TYPE = {
    good: {class: "marker-pgn-good", slice: "markerFrame"},
    mistake: {class: "marker-pgn-mistake", slice: "markerFrame"},
    brilliant: {class: "marker-pgn-brilliant", slice: "markerFrame"},
    blunder: {class: "marker-pgn-blunder", slice: "markerFrame"},
    interesting: {class: "marker-pgn-interesting", slice: "markerFrame"},
    dubious: {class: "marker-pgn-dubious", slice: "markerFrame"}
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
