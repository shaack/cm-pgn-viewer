/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 */

import {Chessboard, COLOR, BORDER_TYPE} from "cm-chessboard/src/Chessboard.js"
import {MARKER_TYPE, Markers} from "cm-chessboard/src/extensions/markers/Markers.js"
import {Chess} from "cm-chess/src/Chess.js"
import {TextUtils} from "cm-web-modules/src/utils/TextUtils.js"
import {NotationRenderer} from "./NotationRenderer.js"

// Font Awesome Free (solid) icon classes for the control buttons. Override via
// the `icons` prop; the embedding page must load Font Awesome Free.
const CONTROL_ICONS = {
    flip: "fa-solid fa-arrows-rotate",
    first: "fa-solid fa-backward-fast",
    previous: "fa-solid fa-backward-step",
    next: "fa-solid fa-forward-step",
    last: "fa-solid fa-forward-fast"
}

// Accessible labels (title / aria-label) for the control buttons.
const CONTROL_LABELS = {
    flip: "Flip board", first: "First move", previous: "Previous move",
    next: "Next move", last: "Last move"
}

export class PgnViewer {

    constructor(context, props = {}) {
        this.props = {
            pgn: undefined,
            orientation: COLOR.white,
            boardTheme: "default",
            piecesFile: "pieces/standard.svg",
            assetsUrl: "./node_modules/cm-chessboard/assets/",
            notationType: "figures",       // "figures" | "san"
            showHeaders: true,
            showControls: true,
            showNotation: true,
            markLastMove: true,
            initialPly: undefined,         // jump to a ply on load, default: start position
            icons: {},                     // override CONTROL_ICONS (Font Awesome classes)
            i18n: {},                      // override CONTROL_LABELS (button titles)
            onMoveSelect: undefined,       // callback(move)
            ...props
        }
        this.context = context
        this.icons = {...CONTROL_ICONS, ...this.props.icons}
        this.labels = {...CONTROL_LABELS, ...this.props.i18n}

        this.chess = new Chess()
        if (this.props.pgn) {
            this.chess.loadPgn(this.props.pgn)
        }
        this.currentMove = undefined // undefined === start position

        this._buildDom()
        this.notationRenderer = new NotationRenderer({notationType: this.props.notationType})
        this._initBoard()
        this._renderHeaders()
        this._renderNotation()
        this._bindEvents()

        const mainline = this.chess.history()
        if (this.props.initialPly && mainline[this.props.initialPly - 1]) {
            this.goToMove(mainline[this.props.initialPly - 1])
        } else {
            this.goToMove(undefined)
        }
    }

    // --- public API ------------------------------------------------------

    /** Jump to a move object (or undefined for the start position). */
    goToMove(move) {
        this.currentMove = move
        const fen = move ? move.fen : this.chess.setUpFen()
        this.board.setPosition(fen, true)
        this._markMove(move)
        const activeEl = this.notationRenderer.setActiveMove(move)
        if (activeEl) {
            this._scrollIntoView(activeEl)
        } else {
            this.elements.notation.scrollTop = 0
        }
        this._updateControls()
        if (typeof this.props.onMoveSelect === "function") {
            this.props.onMoveSelect(move)
        }
    }

    first() {
        this.goToMove(undefined)
    }

    last() {
        const mainline = this.chess.history()
        this.goToMove(mainline.length ? mainline[mainline.length - 1] : undefined)
    }

    /** Next move along the line the currently viewed move belongs to. */
    next() {
        if (!this.currentMove) {
            const mainline = this.chess.history()
            if (mainline.length) {
                this.goToMove(mainline[0])
            }
        } else if (this.currentMove.next) {
            this.goToMove(this.currentMove.next)
        }
    }

    previous() {
        if (this.currentMove && this.currentMove.previous) {
            this.goToMove(this.currentMove.previous)
        } else if (this.currentMove) {
            this.goToMove(undefined)
        }
    }

    flip() {
        const next = this.board.getOrientation() === COLOR.white ? COLOR.black : COLOR.white
        this.board.setOrientation(next, true)
    }

    destroy() {
        if (this.keyHandler) {
            this.elements.root.removeEventListener("keydown", this.keyHandler)
        }
        this.board.destroy()
        this.context.innerHTML = ""
    }

    // --- dom / setup -----------------------------------------------------

    _buildDom() {
        this.context.classList.add("cm-pgn-viewer")
        const parts = []
        if (this.props.showHeaders) {
            parts.push(`<div class="pgn-viewer-headers"></div>`)
        }
        parts.push(`<div class="pgn-viewer-main">`)
        parts.push(`<div class="pgn-viewer-board"></div>`)
        if (this.props.showNotation) {
            parts.push(`<div class="pgn-viewer-notation" tabindex="0"></div>`)
        }
        parts.push(`</div>`)
        if (this.props.showControls) {
            const button = (action) =>
                `<button type="button" class="pgn-viewer-button" data-action="${action}"` +
                ` title="${this.labels[action]}" aria-label="${this.labels[action]}">` +
                `<i class="${this.icons[action]}" aria-hidden="true"></i></button>`
            parts.push(`<div class="pgn-viewer-controls">
                ${button("flip")}${button("first")}${button("previous")}${button("next")}${button("last")}
            </div>`)
        }
        this.context.innerHTML = parts.join("")
        this.elements = {
            root: this.context,
            headers: this.context.querySelector(".pgn-viewer-headers"),
            board: this.context.querySelector(".pgn-viewer-board"),
            notation: this.context.querySelector(".pgn-viewer-notation"),
            controls: this.context.querySelector(".pgn-viewer-controls")
        }
    }

    _initBoard() {
        this.board = new Chessboard(this.elements.board, {
            position: this.chess.setUpFen(),
            orientation: this.props.orientation,
            assetsUrl: this.props.assetsUrl,
            style: {
                cssClass: this.props.boardTheme,
                borderType: BORDER_TYPE.frame,
                pieces: {file: this.props.piecesFile}
            },
            extensions: [{class: Markers}]
        })
    }

    _renderHeaders() {
        if (!this.elements.headers) {
            return
        }
        const tags = this.chess.header()
        const white = tags.White || "?"
        const black = tags.Black || "?"
        const result = tags.Result && tags.Result !== "*" ? tags.Result : ""
        const rest = [tags.Event, tags.Site, tags.Date].filter(t => t && t !== "?").join(", ")
        this.elements.headers.innerHTML =
            `<span class="players"><span class="white-player">${TextUtils.escapeHtml(white)}</span>` +
            ` – <span class="black-player">${TextUtils.escapeHtml(black)}</span>` +
            (result ? ` <span class="result">${TextUtils.escapeHtml(result)}</span>` : "") + `</span>` +
            (rest ? `<span class="event">${TextUtils.escapeHtml(rest)}</span>` : "")
    }

    _renderNotation() {
        if (!this.elements.notation) {
            return
        }
        this.notationRenderer.render(this.elements.notation, this.chess.history())
    }

    _bindEvents() {
        if (this.elements.controls) {
            this.elements.controls.addEventListener("click", (event) => {
                const button = event.target.closest("[data-action]")
                if (!button) {
                    return
                }
                const action = button.dataset.action
                if (typeof this[action] === "function") {
                    this[action]()
                }
            })
        }
        if (this.elements.notation) {
            this.elements.notation.addEventListener("click", (event) => {
                const moveEl = event.target.closest(".move")
                if (!moveEl) {
                    return
                }
                const move = this.notationRenderer.moves[parseInt(moveEl.dataset.moveIndex, 10)]
                if (move) {
                    this.goToMove(move)
                }
            })
        }
        this.keyHandler = (event) => {
            if (event.key === "ArrowRight") {
                this.next()
                event.preventDefault()
            } else if (event.key === "ArrowLeft") {
                this.previous()
                event.preventDefault()
            } else if (event.key === "Home") {
                this.first()
                event.preventDefault()
            } else if (event.key === "End") {
                this.last()
                event.preventDefault()
            }
        }
        this.elements.root.addEventListener("keydown", this.keyHandler)
    }

    _markMove(move) {
        if (!this.props.markLastMove) {
            return
        }
        this.board.removeMarkers(MARKER_TYPE.square)
        if (move) {
            this.board.addMarker(MARKER_TYPE.square, move.from)
            this.board.addMarker(MARKER_TYPE.square, move.to)
        }
    }

    _updateControls() {
        if (!this.elements.controls) {
            return
        }
        const atStart = !this.currentMove
        const atEnd = this.currentMove ? !this.currentMove.next
            : this.chess.history().length === 0
        this._setDisabled("first", atStart)
        this._setDisabled("previous", atStart)
        this._setDisabled("next", atEnd)
        this._setDisabled("last", atEnd)
    }

    _setDisabled(action, disabled) {
        const button = this.elements.controls.querySelector(`[data-action="${action}"]`)
        if (button) {
            button.disabled = disabled
        }
    }

    _scrollIntoView(el) {
        const container = this.elements.notation
        const top = el.offsetTop - container.offsetTop
        const bottom = top + el.offsetHeight
        if (top < container.scrollTop) {
            container.scrollTop = top - 8
        } else if (bottom > container.scrollTop + container.clientHeight) {
            container.scrollTop = bottom - container.clientHeight + 8
        }
    }

    // --- static convenience ---------------------------------------------

    /**
     * Turn every element matched by `selector` into a viewer, using the element's
     * text content as the PGN. Replaces the old jQuery `$.cmPgnViewer($("pgn"))`.
     */
    static initFrom(selector, props = {}) {
        const elements = document.querySelectorAll(selector)
        const viewers = []
        elements.forEach((element) => {
            const pgn = element.textContent.trim()
            const container = document.createElement("div")
            element.replaceWith(container)
            viewers.push(new PgnViewer(container, {...props, pgn}))
        })
        return viewers
    }
}
