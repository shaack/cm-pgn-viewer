/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * Turns PGN text (also sloppy text pasted into a forum) into a cm-pgn `Pgn`,
 * detects Chess960 and reports parse errors instead of throwing.
 */
import {Pgn} from "cm-pgn/src/Pgn.js"

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

export const VARIANT = {
    standard: "standard",
    position: "position", // standard rules, but not from the start position
    chess960: "chess960"
}

const HEADER_PATTERN = /^\s*\[\s*[A-Za-z0-9_]+\s+"(?:[^"\\]|\\.)*"\s*\]/
const COMMENT_PATTERN = /(\{[^}]*\})/

// German piece letters, only used in lenient mode. None of them is a valid
// English SAN piece letter, so translating them cannot break an English PGN.
const GERMAN_PIECES = {S: "N", L: "B", T: "R", D: "Q"}

/**
 * Read the PGN from an element like `<pgn>`, in which line breaks may be
 * `<br>` elements and the text may be HTML escaped.
 */
export function readPgnFromElement(element) {
    const html = element.innerHTML.replace(/<br\s*\/?>/gi, "\n")
    const textarea = document.createElement("textarea")
    textarea.innerHTML = html
    return textarea.value
}

/**
 * Bring the PGN into the shape cm-pgn expects: one header per line and an
 * empty line before the movetext. With `lenient`, also repair what people
 * typically type by hand: 0-0, 1:0, ½-½ and German piece letters.
 */
export function normalizePgn(text, lenient = false) {
    let rest = String(text || "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ")
    const headers = []
    let match
    while ((match = rest.match(HEADER_PATTERN))) {
        headers.push(match[0].trim())
        rest = rest.substring(match[0].length)
    }
    // no empty lines inside the movetext, cm-pgn splits header and movetext at "]\n\n"
    let movetext = rest.trim().replace(/\n\s*\n/g, "\n")
    if (lenient) {
        movetext = movetext.split(COMMENT_PATTERN)
            .map(chunk => chunk.startsWith("{") ? chunk : repairMovetext(chunk))
            .join("")
    }
    if (headers.length === 0) {
        return movetext
    }
    return headers.join("\n") + "\n\n" + movetext
}

function repairMovetext(text) {
    return text
        .replace(/(^|[\s.(])0-0-0(?=$|[\s+#!?)(])/g, "$1O-O-O")
        .replace(/(^|[\s.(])0-0(?=$|[\s+#!?)(])/g, "$1O-O")
        .replace(/(^|\s)(?:1\/2|½)\s*[-:]\s*(?:1\/2|½)(?=$|\s)/g, "$11/2-1/2")
        .replace(/(^|\s)1\s*:\s*0(?=$|\s)/g, "$11-0")
        .replace(/(^|\s)0\s*:\s*1(?=$|\s)/g, "$10-1")
        .replace(/(^|[\s.(])([SLTD])(?=[a-h]?[1-8]?x?[a-h][1-8])/g,
            (all, before, piece) => before + GERMAN_PIECES[piece])
        .replace(/=([SLTD])/g, (all, piece) => "=" + GERMAN_PIECES[piece])
}

/**
 * True, if castling from this FEN needs Chess960 rules: a side may still
 * castle, but its king or a castling rook is not on its classical square.
 */
export function detectChess960(fen) {
    const tokens = String(fen || "").trim().split(/\s+/)
    const castling = tokens[2]
    if (!castling || castling === "-") {
        return false
    }
    const ranks = tokens[0].split("/").map(rank => rank.replace(/\d/g, n => "1".repeat(parseInt(n, 10))))
    if (ranks.length !== 8) {
        return false
    }
    const sides = [
        {rights: castling.replace(/[^A-Z]/g, ""), backRank: ranks[7], king: "K", rook: "R"},
        {rights: castling.replace(/[^a-z]/g, "").toUpperCase(), backRank: ranks[0], king: "k", rook: "r"}
    ]
    for (const side of sides) {
        if (!side.rights) {
            continue
        }
        if (side.backRank.charAt(4) !== side.king) {
            return true
        }
        for (const right of side.rights) {
            if (right === "K" && side.backRank.charAt(7) !== side.rook) {
                return true
            }
            if (right === "Q" && side.backRank.charAt(0) !== side.rook) {
                return true
            }
            if (right !== "K" && right !== "Q") {
                return true // rook files (Shredder-FEN) only make sense in Chess960
            }
        }
    }
    return false
}

function headerValue(text, name) {
    const match = text.match(new RegExp("\\[\\s*" + name + "\\s+\"((?:[^\"\\\\]|\\\\.)*)\"\\s*\\]"))
    return match ? match[1] : undefined
}

/**
 * Parse a PGN.
 * @param text the PGN
 * @param props `lenient` repairs hand typed PGNs, `chess960` forces (true) or
 *        prevents (false) Chess960 rules, undefined detects them
 * @returns {{pgn: Pgn|undefined, text: string, variant: string, setUpFen: string, error: object|undefined}}
 */
export function loadPgn(text, props = {}) {
    const normalized = normalizePgn(text, props.lenient)
    const setUpFen = headerValue(normalized, "SetUp") === "1" && headerValue(normalized, "FEN")
        ? headerValue(normalized, "FEN").trim() : START_FEN
    const variantTag = (headerValue(normalized, "Variant") || "").toLowerCase()
    let chess960 = props.chess960
    if (chess960 === undefined) {
        chess960 = ["chess960", "chess 960", "fischerandom", "freestyle"].includes(variantTag) ||
            detectChess960(setUpFen)
    }
    const result = {
        pgn: undefined,
        text: normalized,
        variant: chess960 ? VARIANT.chess960 : setUpFen !== START_FEN ? VARIANT.position : VARIANT.standard,
        setUpFen: setUpFen,
        error: undefined
    }
    try {
        result.pgn = new Pgn(normalized, {sloppy: !!props.lenient, chess960: chess960})
    } catch (e) {
        result.error = describeError(e)
    }
    return result
}

function describeError(e) {
    if (e && e.notation !== undefined && e.fen !== undefined) {
        return {type: "illegalMove", notation: e.notation, fen: e.fen, message: e.toString()}
    }
    if (e && e.name === "SyntaxError" && e.location) {
        return {type: "syntax", found: e.found, message: e.message}
    }
    return {type: "unknown", message: e && e.message ? e.message : String(e)}
}
