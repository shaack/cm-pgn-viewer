/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * Renders the cm-pgn move tree as text: moves bold, comments as running text,
 * every variation as its own block, nested variations inside their parent.
 */
import {moveNumber} from "./I18n.js"
import {pieceIcon} from "./PieceIcons.js"
import {MOVE_QUALITY} from "./MoveQuality.js"

// For notation "unicode". Solid glyphs take the text colour, U+FE0E asks for
// the text glyph, not an emoji.
export const UNICODE_PIECES = {K: "♚︎", Q: "♛︎", R: "♜︎", B: "♝︎", N: "♞︎"}

export const NAGS = {
    1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!", 7: "□", 10: "=", 13: "∞",
    14: "⩲", 15: "⩱", 16: "±", 17: "∓", 18: "+−", 19: "−+", 22: "⨀", 23: "⨀",
    32: "⟳", 33: "⟳", 36: "→", 37: "→", 40: "↑", 41: "↑", 44: "=∞", 45: "=∞",
    132: "⇆", 133: "⇆", 138: "⨁", 139: "⨁", 140: "∆", 146: "N"
}

export class NotationRenderer {

    /**
     * @param props notation: "icons" (SVG piece icons), "unicode" or "letters",
     *        iconStyle: "auto" (the darker icon for black, depends on the colour scheme), "solid" or "regular",
     *        pieceLetters: the letters for "letters", e.g. {K: "K", Q: "D", R: "T", B: "L", N: "S"},
     *        pieceNames: names for screen readers, e.g. {k: "king", n: "knight"}
     */
    constructor(props = {}) {
        this.props = {
            notation: "icons",
            iconStyle: "auto",
            pieceLetters: {K: "K", Q: "Q", R: "R", B: "B", N: "N"},
            pieceNames: {},
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

    /** The SAN as text, for "icons" with the letters of `pieceLetters`. */
    formatSan(san) {
        const map = this.props.notation === "unicode" ? UNICODE_PIECES : this.props.pieceLetters
        return san
            .replace(/^[KQRBN]/, piece => map[piece] || piece)
            .replace(/=([QRBN])/, (all, piece) => "=" + (map[piece] || piece))
    }

    // --- internals -------------------------------------------------------

    // "auto" renders both styles, the stylesheet shows the one that fits the
    // side and the colour scheme, so it also follows a switch of the scheme
    _iconStyles() {
        return this.props.iconStyle === "auto" ? ["solid", "regular"] : [this.props.iconStyle]
    }

    _iconClass(style) {
        return "piece-icon " + style + (this.props.iconStyle === "auto" ? " auto" : "")
    }

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
        element.className = "move " + (move.color === "w" ? "white" : "black")
        element.dataset.moveIndex = String(this.moves.push(move) - 1)
        this.moveToElement.set(move, element)
        // number and SAN get the highlight, the assessment symbol stands beside it
        const body = document.createElement("span")
        body.className = "move-body"
        element.appendChild(body)
        if (move.color === "w" || needsNumber) {
            const number = document.createElement("span")
            number.className = "move-number"
            number.textContent = moveNumber(move) + (move.color === "w" ? "." : "…")
            element.classList.add("numbered")
            body.appendChild(number)
        }
        const san = document.createElement("span")
        san.className = "san"
        if (this.props.notation === "icons") {
            // the piece letters as SVG icons, the rest of the SAN as text
            for (const part of move.san.split(/([KQRBN])/)) {
                if (/^[KQRBN]$/.test(part)) {
                    const name = this.props.pieceNames[part.toLowerCase()] || this.props.pieceLetters[part]
                    for (const style of this._iconStyles()) {
                        san.insertAdjacentHTML("beforeend",
                            pieceIcon(part, style, {class: this._iconClass(style), "aria-label": name}))
                    }
                } else if (part) {
                    san.appendChild(document.createTextNode(part))
                }
            }
        } else {
            san.textContent = this.formatSan(move.san)
        }
        body.appendChild(san)
        for (const nag of move.nags || []) {
            const symbol = document.createElement("span")
            // move assessments get the colour of their frame on the board
            symbol.className = "nag" + (MOVE_QUALITY[nag] ? " nag-" + MOVE_QUALITY[nag] : "")
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
