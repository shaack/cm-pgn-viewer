/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * Syntax highlighting for PGN text: returns escaped HTML with a span per
 * token. The classes are styled in assets/cm-pgn-viewer.css.
 */
import {MOVE_QUALITY} from "./MoveQuality.js"

const HEADER = /^(\s*)\[(\s*)([A-Za-z0-9_]+)(\s+)("(?:[^"\\]|\\.)*")(\s*)\]/

// order matters: comments and results before moves and numbers
const MOVETEXT = new RegExp([
    /(\{[^}]*\}?)/.source,                              // 1 comment, also unclosed
    /(;[^\n]*)/.source,                                 // 2 rest of line comment
    /(1-0|0-1|1\/2-1\/2|\*)(?=\s|$)/.source,            // 3 result
    /(\d+\.(?:\.\.)?)/.source,                          // 4 move number
    /(\$\d+|[!?]{1,2})/.source,                         // 5 NAG
    /([()])/.source,                                    // 6 variation
    /([^\s{}();$!?]+)/.source                           // 7 move
].join("|"), "g")

// the symbol NAGs as their $n, for the colour of the assessment
const SYMBOL_NAGS = {"!": 1, "?": 2, "!!": 3, "??": 4, "!?": 5, "?!": 6}

export function highlightPgn(text) {
    let rest = String(text || "")
    let html = ""
    let match
    while ((match = rest.match(HEADER))) {
        const [all, space, innerSpace, name, gap, value, end] = match
        html += escape(space) + `<span class="pgn-tag">[${escape(innerSpace)}` +
            `<span class="pgn-tag-name">${escape(name)}</span>${escape(gap)}` +
            `<span class="pgn-tag-value">${escape(value)}</span>${escape(end)}]</span>`
        rest = rest.substring(all.length)
    }
    let last = 0
    for (const token of rest.matchAll(MOVETEXT)) {
        html += escape(rest.substring(last, token.index))
        html += tokenHtml(token)
        last = token.index + token[0].length
    }
    return html + escape(rest.substring(last))
}

function tokenHtml(token) {
    const text = escape(token[0])
    if (token[1] !== undefined || token[2] !== undefined) {
        return `<span class="pgn-comment">${text}</span>`
    }
    if (token[3] !== undefined) {
        return `<span class="pgn-result">${text}</span>`
    }
    if (token[4] !== undefined) {
        return `<span class="pgn-number">${text}</span>`
    }
    if (token[5] !== undefined) {
        const nag = token[5].startsWith("$") ? parseInt(token[5].substring(1), 10) : SYMBOL_NAGS[token[5]]
        const quality = MOVE_QUALITY[nag]
        return `<span class="pgn-nag${quality ? " nag-" + quality : ""}">${text}</span>`
    }
    if (token[6] !== undefined) {
        return `<span class="pgn-variation">${text}</span>`
    }
    return `<span class="pgn-move">${text}</span>`
}

function escape(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
