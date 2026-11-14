/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * Shows the comment of a move as a speech bubble on the board, the tail
 * pointing to the square the move went to. Above the square, below it for
 * the upper ranks, always inside the board.
 */
const GAP = 4 // between the bubble and the square, in px

export class CommentBubble {

    constructor(boardElement, chessboard) {
        this.boardElement = boardElement
        this.chessboard = chessboard
        this.square = undefined
        this.element = document.createElement("div")
        this.element.className = "pgn-viewer-bubble"
        this.element.setAttribute("aria-hidden", "true") // the comment is in the notation
        this.element.hidden = true
        // the text scrolls inside, so the tail outside of the box is not cut off
        this.text = document.createElement("div")
        this.text.className = "pgn-viewer-bubble-text"
        this.element.appendChild(this.text)
        boardElement.appendChild(this.element)
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

    hide() {
        this.square = undefined
        this.element.hidden = true
    }

    position() {
        if (this.element.hidden || !this.square) {
            return
        }
        const view = this.chessboard.view
        const point = view.squareToPoint(this.square)
        const boardWidth = view.width
        const boardHeight = view.height
        const centerX = point.x + view.squareWidth / 2
        const below = point.y < boardHeight * 0.35 // upper ranks: below the square
        const style = this.element.style
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
