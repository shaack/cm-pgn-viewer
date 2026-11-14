/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 */
import {Chessboard, BORDER_TYPE, COLOR} from "cm-chessboard/src/Chessboard.js"
import {Markers, MARKER_TYPE} from "cm-chessboard/src/extensions/markers/Markers.js"
import {Accessibility} from "cm-chessboard/src/extensions/accessibility/Accessibility.js"
import {loadPgn, readPgnFromElement, VARIANT} from "./PgnLoader.js"
import {NotationRenderer} from "./NotationRenderer.js"
import {createI18n, describeMove} from "./I18n.js"
import {highlightPgn} from "./PgnHighlighter.js"
import {CommentBubble, moveCommentText} from "./CommentBubble.js"

import {MOVE_MARKER_TYPE, MOVE_CAPTURE_MARKER_TYPE, moveQuality} from "./MoveQuality.js"

// 16x16 icons, filled with currentColor, so the viewer needs no icon font
export const ICONS = {
    play: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5 14 8 4 13.5z"/></svg>`,
    stop: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z"/></svg>`,
    first: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3H4v10H2.5zM9 3v10L4.5 8zM14 3v10L9.5 8z"/></svg>`,
    previous: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h1.5v10H4zM12 3v10L6 8z"/></svg>`,
    next: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 3H12v10h-1.5zM4 3l6 5-6 5z"/></svg>`,
    last: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3h1.5v10H12zM2 3l4.5 5L2 13zM7 3l4.5 5L7 13z"/></svg>`,
    flip: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 1.5 8.5 5.5H6V14H4V5.5H1.5zM11 14.5 7.5 10.5H10V2h2v8.5h2.5z"/></svg>`,
    pgn: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.3 3.6 6.7 5 3.7 8l3 3-1.4 1.4L.9 8zM10.7 3.6 9.3 5l3 3-3 3 1.4 1.4L15.1 8z"/></svg>`,
    close: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.4 2 8 6.6 12.6 2 14 3.4 9.4 8l4.6 4.6-1.4 1.4L8 9.4 3.4 14 2 12.6 6.6 8 2 3.4z"/></svg>`
}

export {MARKER_TYPE}

const CONTROLS = ["play", "first", "previous", "next", "last", "flip"]

export class PgnViewer {

    constructor(context, props = {}) {
        this.context = context
        this.props = {
            pgn: "",
            lenient: false,                 // repair hand typed PGNs (0-0, 1:0, German piece letters)
            chess960: undefined,            // undefined: detect from the Variant tag and the start FEN
            orientation: COLOR.white,
            boardTheme: "default",          // cm-chessboard css class
            borderType: BORDER_TYPE.none,   // "none", "thin" or "frame" (wide border with the coordinates)
            piecesFile: "pieces/standard.svg",
            assetsUrl: "./node_modules/cm-chessboard/assets/",
            notation: "icons",              // "icons" (SVG piece icons), "unicode" or "letters"
            iconStyle: "auto",              // "auto" (the darker icon for black, by colour scheme), "solid" or "regular"
            pieceLetters: {K: "K", Q: "Q", R: "R", B: "B", N: "N"},
            showHeaders: true,
            showControls: true,
            showPgnToggle: true,
            commentBubbles: true,           // the comment of a move as speech bubble on the board
            bubbleExpanded: true,           // start with the big bubble, otherwise the small one
            lastMoveMarker: MARKER_TYPE.frame, // a cm-chessboard MARKER_TYPE on from/to, null for none
            captureMarker: MARKER_TYPE.bevel, // on the target square of a capture, null for the frame
            qualityMarkers: true,           // assessed moves (!!, !, !?, ?!, ?, ??) get the markers in their colour
            checkMarker: MARKER_TYPE.circleDanger, // on the king in check, null for none
            autoplayInterval: 1000,         // milliseconds per move
            initialPly: undefined,          // jump to this mainline ply on load
            accessibility: true,            // cm-chessboard Accessibility extension and spoken moves
            language: "en",
            i18n: {},
            icons: {},
            onMoveSelect: undefined,        // callback(move), move is undefined for the start position
            ...props
        }
        this.t = createI18n(this.props.language, this.props.i18n)
        this.icons = {...ICONS, ...this.props.icons}
        this.loaded = loadPgn(this.props.pgn, {lenient: this.props.lenient, chess960: this.props.chess960})
        this.currentMove = undefined
        this.autoplayTimer = undefined
        this.context.classList.add("cm-pgn-viewer")
        if (this.loaded.error) {
            this._renderError()
            return
        }
        this.pgn = this.loaded.pgn
        this.history = this.pgn.history.moves
        this._buildDom()
        this._renderHeaders()
        this.notationRenderer = new NotationRenderer({
            notation: this.props.notation,
            iconStyle: this.props.iconStyle,
            pieceLetters: this.props.pieceLetters,
            pieceNames: this.t.pieces
        })
        if (this.elements.notation) {
            this.notationRenderer.render(this.elements.notation, this.history, this.pgn.history.gameComment)
        }
        this._initBoard()
        this._bindEvents()
        this.setCommentBubbles(this.props.commentBubbles)
        const initial = this.props.initialPly ? this.history[this.props.initialPly - 1] : undefined
        this.goToMove(initial, false, false)
    }

    // --- navigation ------------------------------------------------------

    /** Show the position after `move`, undefined for the start position. */
    goToMove(move, animated = true, announce = true) {
        if (!this.board) {
            return // the PGN could not be read
        }
        this.currentMove = move
        this.board.setPosition(move ? move.fen : this.loaded.setUpFen, animated)
        this._markMove(move)
        if (this.props.checkMarker) {
            this.board.removeMarkers(this.props.checkMarker)
            if (move && move.inCheck) {
                const king = kingSquare(move.fen)
                if (king) {
                    this.board.addMarker(this.props.checkMarker, king)
                }
            }
        }
        this._updateBubble()
        const element = this.notationRenderer.setActiveMove(move)
        if (this.elements.notation) {
            if (element) {
                this._scrollIntoView(element)
            } else {
                this.elements.notation.scrollTop = 0
            }
        }
        this._updateControls()
        if (announce && this.elements.live) {
            this.elements.live.textContent = move ? describeMove(move, this.t) : this.t.startPosition
        }
        if (typeof this.props.onMoveSelect === "function") {
            this.props.onMoveSelect(move)
        }
    }

    first() {
        this.goToMove(undefined)
    }

    previous() {
        if (this.currentMove) {
            // the first move of a variation points to the move before the branch
            this.goToMove(this.currentMove.previous || undefined)
        }
    }

    next() {
        const next = this._nextMove()
        if (next) {
            this.goToMove(next)
        }
    }

    /** The end of the line that is shown, the mainline from the start position. */
    last() {
        let move = this.currentMove || this._nextMove()
        while (move && move.next) {
            move = move.next
        }
        if (move) {
            this.goToMove(move)
        }
    }

    /** Switch the comment bubbles on the board on or off. */
    setCommentBubbles(on) {
        if (!this.board) {
            return
        }
        this.commentBubbles = !!on
        this._updateBubble()
    }

    /** Open the modal with the PGN, syntax highlighted. */
    showPgn() {
        const dialog = this.elements && this.elements.dialog
        if (!dialog) {
            return
        }
        const pre = dialog.querySelector(".pgn-viewer-pgn")
        if (!pre.innerHTML) {
            pre.innerHTML = highlightPgn(this.loaded.text)
        }
        this.stop()
        dialog.showModal()
    }

    flip() {
        if (!this.board) {
            return
        }
        // the board turns in its animation queue, the bubble follows when it is done
        return this.board.setOrientation(this.board.getOrientation() === COLOR.white ? COLOR.black : COLOR.white)
            .then(() => {
                if (this.bubble) {
                    this.bubble.position()
                }
            })
    }

    play() {
        if (!this.board) {
            return
        }
        if (this.autoplayTimer) {
            this.stop()
            return
        }
        if (!this._nextMove()) {
            this.goToMove(undefined) // at the end, play from the start
        }
        this.autoplayTimer = setInterval(() => {
            if (this._nextMove()) {
                this.goToMove(this._nextMove(), true, false)
            }
            if (!this._nextMove()) {
                this.stop()
            }
        }, this.props.autoplayInterval)
        this._updateControls()
    }

    stop() {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer)
            this.autoplayTimer = undefined
            this._updateControls()
        }
    }

    destroy() {
        this.stop()
        if (this.bubble) {
            this.bubble.destroy()
        }
        if (this.board) {
            this.board.destroy()
        }
        this.context.innerHTML = ""
        this.context.classList.remove("cm-pgn-viewer")
    }

    // --- dom -------------------------------------------------------------

    _buildDom() {
        const parts = []
        if (this.props.showHeaders) {
            parts.push(`<div class="pgn-viewer-headers"></div>`)
        }
        parts.push(`<div class="pgn-viewer-main">`)
        parts.push(`<div class="pgn-viewer-board"></div>`)
        if (this.props.showControls) {
            parts.push(`<div class="pgn-viewer-controls">`)
            for (const action of CONTROLS) {
                parts.push(`<button type="button" class="pgn-viewer-button" data-action="${action}"` +
                    ` title="${escapeHtml(this.t[action])}" aria-label="${escapeHtml(this.t[action])}">` +
                    `${this.icons[action]}</button>`)
            }
            parts.push(`</div>`)
        }
        if (this.history.length > 0 || this.pgn.history.gameComment) {
            parts.push(`<div class="pgn-viewer-notation-area">` +
                `<div class="pgn-viewer-notation" tabindex="0" role="region" aria-label="${escapeHtml(this.t.notation)}"></div>` +
                `</div>`)
        }
        if (this.props.showPgnToggle) {
            parts.push(this._pgnSourceHtml()) // below the notation, right
        }
        parts.push(`</div>`)
        if (this.props.accessibility) {
            parts.push(`<div class="pgn-viewer-live visually-hidden" aria-live="polite"></div>`)
        }
        this.context.innerHTML = parts.join("")
        const find = (selector) => this.context.querySelector(selector) || undefined
        this.elements = {
            headers: find(".pgn-viewer-headers"),
            main: find(".pgn-viewer-main"),
            board: find(".pgn-viewer-board"),
            controls: find(".pgn-viewer-controls"),
            notation: find(".pgn-viewer-notation"),
            source: find(".pgn-viewer-source"),
            dialog: find(".pgn-viewer-dialog"),
            live: find(".pgn-viewer-live")
        }
    }

    _pgnSourceHtml() {
        return `<div class="pgn-viewer-source">` +
            `<button type="button" class="pgn-viewer-button pgn-viewer-text-button" data-action="showPgn" aria-haspopup="dialog">` +
            `${this.icons.pgn}<span>${escapeHtml(this.t.showPgn)}</span></button>` +
            `</div>` +
            `<dialog class="pgn-viewer-dialog" aria-label="PGN">` +
            `<div class="pgn-viewer-dialog-header">` +
            `<span class="pgn-viewer-dialog-title">PGN</span>` +
            `<button type="button" class="pgn-viewer-link" data-action="copyPgn">${escapeHtml(this.t.copy)}</button>` +
            `<button type="button" class="pgn-viewer-close" data-action="closePgn" autofocus ` +
            `title="${escapeHtml(this.t.close)}" aria-label="${escapeHtml(this.t.close)}">${this.icons.close}</button>` +
            `</div>` +
            `<pre class="pgn-viewer-pgn"></pre>` +
            `</dialog>`
    }

    _renderHeaders() {
        if (!this.elements.headers) {
            return
        }
        const tags = this.pgn.header.tags
        const known = (value) => value && value !== "?" && value !== "-" && value !== "*"
        const player = (name, elo) => known(name)
            ? escapeHtml(name) + (known(elo) ? ` <span class="elo">${escapeHtml(elo)}</span>` : "")
            : "?"
        const parts = []
        if (known(tags.White) || known(tags.Black)) {
            parts.push(`<div class="players">${player(tags.White, tags.WhiteElo)} – ${player(tags.Black, tags.BlackElo)}</div>`)
        }
        const date = known(tags.Date) ? tags.Date.replace(/(\.\?\?)+$/, "") : undefined
        const meta = [tags.Event, tags.Site, tags.Round, date, tags.ECO, tags.Result].filter(known).map(escapeHtml)
        if (this.loaded.variant !== VARIANT.standard) {
            meta.push(`<span class="badge">${escapeHtml(this.t[this.loaded.variant])}</span>`)
        }
        if (meta.length) {
            parts.push(`<div class="meta">${meta.join(`<span class="separator"> | </span>`)}</div>`)
        }
        this.elements.headers.innerHTML = parts.join("")
    }

    _renderError() {
        const error = this.loaded.error
        const message = error.type === "illegalMove"
            ? this.t.errorIllegalMove.replace("{notation}", error.notation)
            : this.t.errorSyntax
        this.context.innerHTML = `<div class="pgn-viewer-error" role="alert">` +
            `<div class="message">${escapeHtml(message)}</div>` +
            (error.type === "syntax" ? `<div class="details">${escapeHtml(error.message)}</div>` : "") +
            `<pre>${escapeHtml(this.loaded.text)}</pre></div>`
    }

    _initBoard() {
        const extensions = [{class: Markers}]
        if (this.props.accessibility) {
            extensions.push({
                class: Accessibility, props: {
                    language: this.props.language === "de" ? "de" : "en",
                    movePieceForm: false, boardAsTable: false, piecesAsList: true
                }
            })
        }
        this.board = new Chessboard(this.elements.board, {
            position: this.loaded.setUpFen,
            orientation: this.props.orientation,
            assetsUrl: this.props.assetsUrl,
            style: {
                cssClass: this.props.boardTheme,
                borderType: this.props.borderType,
                pieces: {file: this.props.piecesFile}
            },
            extensions: extensions
        })
    }

    _bindEvents() {
        this.context.addEventListener("click", (event) => {
            const button = event.target.closest("[data-action]")
            if (button && this.context.contains(button)) {
                this._action(button.dataset.action)
                return
            }
            if (this.elements.notation && this.elements.notation.contains(event.target)) {
                const move = this.notationRenderer.moveFromElement(event.target)
                if (move) {
                    this.stop()
                    this.goToMove(move)
                }
            }
        })
        if (this.elements.dialog) {
            // a click on the backdrop lands on the dialog itself
            this.elements.dialog.addEventListener("click", (event) => {
                if (event.target === this.elements.dialog) {
                    this.elements.dialog.close()
                }
            })
        }
        this.context.addEventListener("keydown", (event) => {
            if (event.target.closest("pre, dialog") || event.altKey || event.ctrlKey || event.metaKey) {
                return
            }
            const actions = {ArrowRight: "next", ArrowLeft: "previous", Home: "first", End: "last"}
            if (actions[event.key]) {
                this._action(actions[event.key])
                event.preventDefault()
            }
        })
    }

    _action(action) {
        if (action === "showPgn") {
            this.showPgn()
        } else if (action === "closePgn") {
            this.elements.dialog.close()
        } else if (action === "copyPgn") {
            this._copyPgn()
        } else if (action === "play") {
            this.play()
        } else if (typeof this[action] === "function") {
            if (action !== "flip") {
                this.stop()
            }
            this[action]()
        }
    }

    _copyPgn() {
        const button = this.elements.dialog.querySelector("[data-action=copyPgn]")
        if (navigator.clipboard) {
            navigator.clipboard.writeText(this.loaded.text).then(() => {
                button.textContent = this.t.copied
                setTimeout(() => button.textContent = this.t.copy, 2000)
            })
        }
    }

    /**
     * The frame on both squares of the move, the capture marker (bevel) on the
     * target of a capture. Assessed moves get both in the colour of the assessment.
     */
    _markMove(move) {
        for (const marker of this.moveMarkers || []) {
            this.board.removeMarkers(marker)
        }
        this.moveMarkers = []
        if (!move) {
            return
        }
        const quality = this.props.qualityMarkers ? moveQuality(move) : undefined
        const frame = quality ? MOVE_MARKER_TYPE[quality] : this.props.lastMoveMarker
        const capture = move.captured && this.props.captureMarker
            ? (quality ? MOVE_CAPTURE_MARKER_TYPE[quality] : this.props.captureMarker)
            : frame
        if (frame) {
            this.board.addMarker(frame, move.from)
            this.moveMarkers.push(frame)
        }
        if (capture) {
            this.board.addMarker(capture, move.to)
            this.moveMarkers.push(capture)
        }
    }

    _updateBubble() {
        if (!this.commentBubbles || !this.currentMove) {
            if (this.bubble) {
                this.bubble.hide()
            }
            return
        }
        if (!this.bubble) {
            this.bubble = new CommentBubble(this.elements.board, this.board)
            this.bubble.setCollapsed(!this.props.bubbleExpanded)
        }
        this.bubble.show(moveCommentText(this.currentMove), this.currentMove.to, this.currentMove.from)
    }

    _nextMove() {
        if (!this.history) {
            return undefined
        }
        return this.currentMove ? this.currentMove.next : this.history[0]
    }

    _updateControls() {
        if (!this.elements.controls) {
            return
        }
        const atStart = !this.currentMove
        const atEnd = !this._nextMove()
        const set = (action, disabled) => {
            this.elements.controls.querySelector(`[data-action="${action}"]`).disabled = disabled
        }
        set("first", atStart)
        set("previous", atStart)
        set("next", atEnd)
        set("last", atEnd)
        set("play", this.history.length === 0)
        const play = this.elements.controls.querySelector(`[data-action="play"]`)
        const playing = !!this.autoplayTimer
        play.innerHTML = playing ? this.icons.stop : this.icons.play
        play.title = playing ? this.t.stop : this.t.play
        play.setAttribute("aria-label", play.title)
        play.classList.toggle("playing", playing)
    }

    _scrollIntoView(element) {
        // keep the active move in the vertical middle of the notation, only the
        // notation scrolls, never the page
        const container = this.elements.notation
        const top = element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
        const target = Math.max(0, top + element.offsetHeight / 2 - container.clientHeight / 2)
        const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
        if (typeof container.scrollTo === "function") {
            container.scrollTo({top: target, behavior: reducedMotion ? "auto" : "smooth"})
        } else {
            container.scrollTop = target
        }
    }

    // --- static ----------------------------------------------------------

    /**
     * Turn every element matched by `selector` (or every element of a NodeList
     * or array) into a viewer. The element's text is the PGN, `<br>` counts as a
     * line break. With `lazy: true` a viewer is built when it scrolls into view,
     * which keeps pages with many games fast.
     * @returns {PgnViewer[]} the viewers, lazy ones are added when they are built
     */
    static initFrom(selector, props = {}) {
        const elements = typeof selector === "string" ? document.querySelectorAll(selector) : selector
        const {lazy, ...viewerProps} = props
        const viewers = []
        const create = (container, pgn) => viewers.push(new PgnViewer(container, {...viewerProps, pgn}))
        const observer = lazy && typeof IntersectionObserver !== "undefined"
            ? new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        observer.unobserve(entry.target)
                        entry.target.classList.remove("pending")
                        create(entry.target, entry.target.pendingPgn)
                        delete entry.target.pendingPgn
                    }
                }
            }, {rootMargin: "400px 0px"})
            : undefined
        for (const element of Array.from(elements)) {
            const pgn = readPgnFromElement(element)
            const container = document.createElement("div")
            element.replaceWith(container)
            if (observer) {
                container.classList.add("cm-pgn-viewer", "pending")
                container.pendingPgn = pgn
                observer.observe(container)
            } else {
                create(container, pgn)
            }
        }
        return viewers
    }
}

/** The square of the king of the side to move in `fen`. */
export function kingSquare(fen) {
    const [placement, turn] = fen.split(/\s+/)
    const king = turn === "w" ? "K" : "k"
    const ranks = placement.split("/")
    for (let r = 0; r < 8; r++) {
        const file = ranks[r].replace(/\d/g, n => "1".repeat(parseInt(n, 10))).indexOf(king)
        if (file !== -1) {
            return "abcdefgh"[file] + (8 - r)
        }
    }
    return undefined
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}
