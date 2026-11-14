/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * Labels and the words for spoken moves. Override single entries with the
 * `i18n` prop of the viewer.
 */
import {moveQuality} from "./MoveQuality.js"

export const TRANSLATIONS = {
    en: {
        play: "Play", stop: "Stop", first: "Start position", previous: "Previous move",
        next: "Next move", last: "End of line", flip: "Flip board",
        notation: "Notation", startPosition: "Start position",
        showPgn: "Show PGN", copy: "Copy", copied: "Copied", close: "Close",
        chess960: "Chess960", position: "Position",
        errorSyntax: "The PGN could not be read.",
        errorIllegalMove: "Illegal move: {notation}",
        white: "White", black: "Black",
        pieces: {p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king"},
        captures: "takes", castlesShort: "castles short", castlesLong: "castles long",
        promotes: "promotes to", check: "check", checkmate: "checkmate",
        quality: {
            good: "good move", mistake: "mistake", brilliant: "brilliant move",
            blunder: "blunder", interesting: "interesting move", dubious: "dubious move"
        }
    },
    de: {
        play: "Abspielen", stop: "Anhalten", first: "Ausgangsstellung", previous: "Zug zurück",
        next: "Nächster Zug", last: "Ende der Zugfolge", flip: "Brett drehen",
        notation: "Notation", startPosition: "Ausgangsstellung",
        showPgn: "PGN anzeigen", copy: "Kopieren", copied: "Kopiert", close: "Schließen",
        chess960: "Schach960", position: "Stellung",
        errorSyntax: "Die PGN konnte nicht gelesen werden.",
        errorIllegalMove: "Ungültiger Zug: {notation}",
        white: "Weiß", black: "Schwarz",
        pieces: {p: "Bauer", n: "Springer", b: "Läufer", r: "Turm", q: "Dame", k: "König"},
        captures: "schlägt", castlesShort: "kurze Rochade", castlesLong: "lange Rochade",
        promotes: "wandelt um in", check: "Schach", checkmate: "Matt",
        quality: {
            good: "guter Zug", mistake: "Fehler", brilliant: "sehr guter Zug",
            blunder: "grober Fehler", interesting: "interessanter Zug", dubious: "zweifelhafter Zug"
        }
    }
}

export function createI18n(language, overrides = {}) {
    const base = TRANSLATIONS[language] || TRANSLATIONS.en
    return {
        ...base,
        ...overrides,
        pieces: {...base.pieces, ...(overrides.pieces || {})},
        quality: {...base.quality, ...(overrides.quality || {})}
    }
}

export function moveNumber(move) {
    // from the FEN after the move, so a game starting at move 23 counts from 23
    const fullmove = parseInt(move.fen.split(/\s+/)[5], 10)
    return move.color === "w" ? fullmove : fullmove - 1
}

/** The move as words, for screen readers: "12. White: bishop takes g7, check". */
export function describeMove(move, t) {
    const words = []
    const flags = move.flags || ""
    if (flags.includes("k")) {
        words.push(t.castlesShort)
    } else if (flags.includes("q")) {
        words.push(t.castlesLong)
    } else {
        words.push(t.pieces[move.piece] || move.piece)
        if (move.captured) {
            words.push(t.captures)
        }
        words.push(move.to)
        if (move.promotion) {
            words.push(t.promotes, t.pieces[move.promotion] || move.promotion)
        }
    }
    let text = moveNumber(move) + ". " + (move.color === "w" ? t.white : t.black) + ": " + words.join(" ")
    if (move.inCheckmate) {
        text += ", " + t.checkmate
    } else if (move.inCheck) {
        text += ", " + t.check
    }
    const quality = moveQuality(move)
    if (quality) {
        text += ", " + t.quality[quality]
    }
    return text
}
