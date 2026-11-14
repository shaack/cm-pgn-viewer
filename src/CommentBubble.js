/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * Shows the comment of a move as a speech bubble on the board, the tail
 * pointing to the square the move went to. Above the square, below it for
 * the upper ranks, always inside the board.
 *
 * Small, a round speech icon at the corner of the square, by default. A click
 * on it or on the piece of the move toggles between small and big. The state
 * stays while going through the game.
 */
const GAP = 4 // between the bubble and the square, in px
const FILES = "abcdefgh"
const ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7.5L4 15v-3H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm1 3v1.5h8V5zm0 3v1.5h5.5V8z"/></svg>`

export class CommentBubble {

    constructor(boardElement, chessboard) {
        this.boardElement = boardElement
        this.chessboard = chessboard
        this.square = undefined
        this.collapsed = false
        this.element = document.createElement("div")
        this.element.className = "pgn-viewer-bubble"
        this.element.setAttribute("aria-hidden", "true") // the comment is in the notation
        this.element.hidden = true
        // the text scrolls inside, so the tail outside of the box is not cut off
        this.text = document.createElement("div")
        this.text.className = "pgn-viewer-bubble-text"
        this.element.appendChild(this.text)
        this.icon = document.createElement("div")
        this.icon.className = "pgn-viewer-bubble-icon"
        this.icon.innerHTML = ICON
        this.element.appendChild(this.icon)
        boardElement.appendChild(this.element)
        this.clickHandler = (event) => {
            if (this.element.contains(event.target) || this.isOverSquare(event)) {
                this.setCollapsed(!this.collapsed)
            }
        }
        // a pointer cursor over the piece with the comment
        this.moveHandler = (event) => {
            this.boardElement.style.cursor = this.isOverSquare(event) ? "pointer" : ""
        }
        boardElement.addEventListener("click", this.clickHandler)
        boardElement.addEventListener("pointermove", this.moveHandler)
        if (typeof ResizeObserver !== "undefined") {
            // cm-chessboard redraws in a timeout after a resize, position after it
            this.resizeObserver = new ResizeObserver(() => setTimeout(() => this.position()))
            this.resizeObserver.observe(boardElement)
        }
    }

    /** Show `text` at `square`, hide the bubble without text. */
    show(text, square) {
        if (!text || !square) {
            this.hide()
            return
        }
        this.square = square
        this.text.textContent = text
        this.element.hidden = false
        this.text.scrollTop = 0
        this.position()
    }

    setCollapsed(collapsed) {
        this.collapsed = !!collapsed
        this.element.classList.toggle("collapsed", this.collapsed)
        this.position()
    }

    isOverSquare(event) {
        return !this.element.hidden && !!this.square && this.squareAt(event) === this.square
    }

    /** The square under a pointer event, respecting the orientation. */
    squareAt(event) {
        const view = this.chessboard.view
        const rect = this.boardElement.getBoundingClientRect()
        const file = Math.floor((event.clientX - rect.left - view.borderSize) / view.squareWidth)
        const rank = Math.floor((event.clientY - rect.top - view.borderSize) / view.squareHeight)
        if (file < 0 || file > 7 || rank < 0 || rank > 7) {
            return undefined
        }
        return this.chessboard.getOrientation() === "w"
            ? FILES[file] + (8 - rank)
            : FILES[7 - file] + (rank + 1)
    }

    hide() {
        this.square = undefined
        this.element.hidden = true
        this.boardElement.style.cursor = ""
    }

    position() {
        if (this.element.hidden || !this.square) {
            return
        }
        const view = this.chessboard.view
        const point = view.squareToPoint(this.square)
        const boardWidth = view.width
        const boardHeight = view.height
        const style = this.element.style
        if (this.collapsed) {
            // small and round, over the upper right corner of the square
            const size = this.element.offsetWidth
            const left = Math.min(Math.max(point.x + view.squareWidth - size * 0.6, GAP), boardWidth - size - GAP)
            const top = Math.min(Math.max(point.y - size * 0.4, GAP), boardHeight - size - GAP)
            style.maxWidth = ""
            style.left = Math.round(left) + "px"
            style.top = Math.round(top) + "px"
            style.bottom = ""
            return
        }
        const centerX = point.x + view.squareWidth / 2
        const below = point.y < boardHeight * 0.35 // upper ranks: below the square
        style.maxWidth = Math.round(boardWidth * 0.7) + "px"
        this.text.style.maxHeight = Math.round(boardHeight * 0.45) + "px"
        style.left = "0px"
        const width = this.element.offsetWidth
        const left = Math.min(Math.max(centerX - width / 2, GAP), boardWidth - width - GAP)
        style.left = Math.round(left) + "px"
        if (below) {
            style.top = Math.round(point.y + view.squareHeight + GAP) + "px"
            style.bottom = ""
        } else {
            style.top = ""
            style.bottom = Math.round(boardHeight - point.y + GAP) + "px"
        }
        this.element.classList.toggle("below", below)
        // the tail points to the middle of the square, as far as the corners allow
        style.setProperty("--tail-x", Math.round(Math.min(Math.max(centerX - left, 14), width - 14)) + "px")
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
        }
        this.boardElement.removeEventListener("click", this.clickHandler)
        this.boardElement.removeEventListener("pointermove", this.moveHandler)
        this.boardElement.style.cursor = ""
        this.element.remove()
    }
}

/** The comments after a move as one text, without embedded commands like [%clk]. */
export function moveCommentText(move) {
    return [].concat((move && move.comments) || [])
        .map(comment => String(comment).replace(/\[%[^\]]*\]/g, "").trim())
        .filter(text => text)
        .join(" ")
}
