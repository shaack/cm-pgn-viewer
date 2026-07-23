/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * Renders a cm-pgn / cm-chess move history (with variations, NAGs and comments)
 * into clickable HTML. The heavy lifting a PGN viewer needs and which the flat
 * `History` of chess-console does not provide.
 */

// Unicode figurines used for the "figures" notation type. Solid glyphs read well
// in both light and dark themes, independent of the moving side.
const FIGURES = {
    K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞"
}

// The most common NAGs mapped to their conventional glyphs. Unknown NAGs fall
// back to their raw "$n" token.
const NAGS = {
    $1: "!", $2: "?", $3: "!!", $4: "??", $5: "!?", $6: "?!",
    $7: "□", $10: "=", $13: "∞", $14: "⩲", $15: "⩱",
    $16: "±", $17: "∓", $18: "+−", $19: "−+",
    $20: "+−", $21: "−+", $22: "⨀", $23: "⨀",
    $36: "→", $40: "→", $44: "=∞", $132: "⇆", $138: "⨁"
}

export class NotationRenderer {

    constructor(props = {}) {
        this.props = {
            notationType: "figures", // "figures" | "san"
            renderComments: true,
            renderNags: true,
            ...props
        }
        // registry mapping the DOM back to move objects, and the reverse for
        // highlighting the active move.
        this.moves = []
        this.moveToElement = new Map()
    }

    /**
     * Render a mainline into `container` (cleared first).
     * @param container the DOM element to render into
     * @param mainline the array of moves (chess.history())
     */
    render(container, mainline) {
        this.moves = []
        this.moveToElement = new Map()
        container.innerHTML = ""
        this._renderLine(container, mainline, true)
    }

    /**
     * @param move the currently viewed move (or undefined for the start position)
     */
    setActiveMove(move) {
        for (const el of this.moveToElement.values()) {
            el.classList.remove("active")
        }
        if (move) {
            const el = this.moveToElement.get(move)
            if (el) {
                el.classList.add("active")
                return el
            }
        }
        return null
    }

    // --- internals -------------------------------------------------------

    _renderLine(parent, moves, isMainline) {
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i]
            const isFirstOfLine = i === 0
            if (this.props.renderComments && move.commentBefore) {
                parent.appendChild(this._comment(move.commentBefore))
            }
            parent.appendChild(this._moveElement(move, isFirstOfLine))
            if (this.props.renderComments && move.commentAfter) {
                parent.appendChild(this._comment(move.commentAfter))
            }
            // variations branch off *from the position before* this move, so
            // they are rendered right after it.
            if (move.variations && move.variations.length > 0) {
                for (const variation of move.variations) {
                    const varEl = document.createElement("span")
                    varEl.className = "variation"
                    varEl.appendChild(document.createTextNode("("))
                    this._renderLine(varEl, variation, false)
                    varEl.appendChild(document.createTextNode(")"))
                    parent.appendChild(varEl)
                }
            }
        }
    }

    _moveElement(move, isFirstOfLine) {
        const span = document.createElement("span")
        span.className = "move " + (move.color === "w" ? "white" : "black")
        const index = this.moves.push(move) - 1
        span.dataset.moveIndex = String(index)
        this.moveToElement.set(move, span)

        const moveNumber = Math.floor((move.ply - 1) / 2) + 1
        let numberText = ""
        if (move.color === "w") {
            numberText = moveNumber + ". "
        } else if (isFirstOfLine) {
            numberText = moveNumber + "… " // e.g. "3… Nf6" when a line starts on black
        }
        if (numberText) {
            const num = document.createElement("span")
            num.className = "move-number"
            num.textContent = numberText
            span.appendChild(num)
        }

        const san = document.createElement("span")
        san.className = "san"
        san.textContent = this._formatSan(move.san)
        span.appendChild(san)

        if (this.props.renderNags && move.nag) {
            const nag = document.createElement("span")
            nag.className = "nag"
            nag.textContent = NAGS[move.nag] || move.nag
            span.appendChild(nag)
        }
        span.appendChild(document.createTextNode(" "))
        return span
    }

    _formatSan(san) {
        if (this.props.notationType !== "figures") {
            return san
        }
        const first = san.charAt(0)
        if (FIGURES[first]) {
            return FIGURES[first] + san.slice(1)
        }
        return san
    }

    _comment(text) {
        const span = document.createElement("span")
        span.className = "comment"
        span.textContent = text + " "
        return span
    }
}
