/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * Renders the cm-pgn move tree as text: moves bold, comments as running text,
 * every variation as its own block, nested variations inside their parent.
 */
import {moveNumber} from "./I18n.js"

// Solid figurines take the text colour, so they read in light and dark themes.
// U+FE0E asks for the text glyph, not an emoji.
export const FIGURES = {K: "♚︎", Q: "♛︎", R: "♜︎", B: "♝︎", N: "♞︎"}
const FIGURE_GLYPHS = new Set(Object.values(FIGURES))

export const NAGS = {
    1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!", 7: "□", 10: "=", 13: "∞",
    14: "⩲", 15: "⩱", 16: "±", 17: "∓", 18: "+−", 19: "−+", 22: "⨀", 23: "⨀",
    32: "⟳", 33: "⟳", 36: "→", 37: "→", 40: "↑", 41: "↑", 44: "=∞", 45: "=∞",
    132: "⇆", 133: "⇆", 138: "⨁", 139: "⨁", 140: "∆", 146: "N"
}

export class NotationRenderer {

    /**
     * @param props notation: "figures" or "letters", pieceLetters: the letters
     *        for "letters", e.g. {K: "K", Q: "D", R: "T", B: "L", N: "S"}
     */
    constructor(props = {}) {
        this.props = {
            notation: "figures",
            pieceLetters: {K: "K", Q: "Q", R: "R", B: "B", N: "N"},
            ...props
        }
        this.moves = [] // index (data-move-index) -> move
        this.moveToElement = new Map()
        this.activeElement = undefined
    }

    render(container, history, gameComment = undefined) {
        this.moves = []
        this.moveToElement = new Map()
        this.activeElement = undefined
        container.innerHTML = ""
        if (gameComment) {
            this._appendComments(container, gameComment)
        }
        this._renderLine(container, history)
    }

    /** @returns the element of the move, undefined for the start position */
    setActiveMove(move) {
        if (this.activeElement) {
            this.activeElement.classList.remove("active")
            this.activeElement.removeAttribute("aria-current")
        }
        this.activeElement = move ? this.moveToElement.get(move) : undefined
        if (this.activeElement) {
            this.activeElement.classList.add("active")
            this.activeElement.setAttribute("aria-current", "true")
        }
        return this.activeElement
    }

    moveFromElement(element) {
        const moveElement = element.closest("[data-move-index]")
        return moveElement ? this.moves[parseInt(moveElement.dataset.moveIndex, 10)] : undefined
    }

    formatSan(san) {
        const map = this.props.notation === "letters" ? this.props.pieceLetters : FIGURES
        return san
            .replace(/^[KQRBN]/, piece => map[piece] || piece)
            .replace(/=([QRBN])/, (all, piece) => "=" + (map[piece] || piece))
    }

    // --- internals -------------------------------------------------------

    _renderLine(parent, moves) {
        let needsNumber = true // at the start of a line and after comments or variations
        for (const move of moves) {
            if (move.startingComments && this._appendComments(parent, move.startingComments)) {
                needsNumber = true
            }
            parent.appendChild(this._moveElement(move, needsNumber))
            needsNumber = false
            if (move.comments && this._appendComments(parent, move.comments)) {
                needsNumber = true
            }
            for (const variation of move.variations || []) {
                if (variation.length === 0) {
                    continue
                }
                const block = document.createElement("div")
                block.className = "variation"
                this._renderLine(block, variation)
                parent.appendChild(block)
                needsNumber = true
            }
        }
    }

    _moveElement(move, needsNumber) {
        const element = document.createElement("span")
        element.className = "move"
        element.dataset.moveIndex = String(this.moves.push(move) - 1)
        this.moveToElement.set(move, element)
        if (move.color === "w" || needsNumber) {
            const number = document.createElement("span")
            number.className = "move-number"
            number.textContent = moveNumber(move) + (move.color === "w" ? "." : "…")
            element.appendChild(number)
        }
        const san = document.createElement("span")
        san.className = "san"
        for (const part of this.formatSan(move.san).split(/([♚♛♜♝♞]︎)/)) {
            if (FIGURE_GLYPHS.has(part)) {
                const figure = document.createElement("span")
                figure.className = "figure"
                figure.textContent = part
                san.appendChild(figure)
            } else if (part) {
                san.appendChild(document.createTextNode(part))
            }
        }
        element.appendChild(san)
        for (const nag of move.nags || []) {
            const symbol = document.createElement("span")
            symbol.className = "nag"
            symbol.textContent = NAGS[nag] || "$" + nag
            element.appendChild(symbol)
        }
        // keep the text flowing: a space after each move allows line breaks
        const wrapper = document.createDocumentFragment()
        wrapper.appendChild(element)
        wrapper.appendChild(document.createTextNode(" "))
        return wrapper
    }

    /** @returns {boolean} true, if a comment was rendered */
    _appendComments(parent, comments) {
        let rendered = false
        for (const raw of [].concat(comments)) {
            // drop embedded commands like [%clk 0:05:00] or [%cal Ge2e4]
            const text = String(raw).replace(/\[%[^\]]*\]/g, "").trim()
            if (!text) {
                continue
            }
            const comment = document.createElement("span")
            comment.className = "comment"
            comment.textContent = text
            parent.appendChild(comment)
            parent.appendChild(document.createTextNode(" "))
            rendered = true
        }
        return rendered
    }
}
