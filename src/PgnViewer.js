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

// 16x16 icons, filled with currentColor, so the viewer needs no icon font
export const ICONS = {
    play: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5 14 8 4 13.5z"/></svg>`,
    stop: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z"/></svg>`,
    first: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3H4v10H2.5zM9 3v10L4.5 8zM14 3v10L9.5 8z"/></svg>`,
    previous: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h1.5v10H4zM12 3v10L6 8z"/></svg>`,
    next: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 3H12v10h-1.5zM4 3l6 5-6 5z"/></svg>`,
    last: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3h1.5v10H12zM2 3l4.5 5L2 13zM7 3l4.5 5L7 13z"/></svg>`,
    flip: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 1.5 8.5 5.5H6V14H4V5.5H1.5zM11 14.5 7.5 10.5H10V2h2v8.5h2.5z"/></svg>`
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
            notation: "figures",            // "figures" or "letters"
            pieceLetters: {K: "K", Q: "Q", R: "R", B: "B", N: "N"},
            showHeaders: true,
            showControls: true,
            showPgnToggle: true,
            lastMoveMarker: MARKER_TYPE.frame, // a cm-chessboard MARKER_TYPE, null for no marker
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
            pieceLetters: this.props.pieceLetters
        })
        if (this.elements.notation) {
            this.notationRenderer.render(this.elements.notation, this.history, this.pgn.history.gameComment)
        }
        this._initBoard()
        this._bindEvents()
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
        const marker = this.props.lastMoveMarker
        if (marker) {
            this.board.removeMarkers(marker)
            if (move) {
                this.board.addMarker(marker, move.from)
                this.board.addMarker(marker, move.to)
            }
        }
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

    flip() {
        if (!this.board) {
            return
        }
        this.board.setOrientation(this.board.getOrientation() === COLOR.white ? COLOR.black : COLOR.white)
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
        parts.push(`</div>`)
        if (this.props.showPgnToggle) {
            parts.push(this._pgnSourceHtml())
        }
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
            live: find(".pgn-viewer-live")
        }
    }

    _pgnSourceHtml() {
        return `<div class="pgn-viewer-source">` +
            `<button type="button" class="pgn-viewer-link" data-action="togglePgn" aria-expanded="false">${escapeHtml(this.t.showPgn)}</button>` +
            `<div class="pgn-viewer-source-text" hidden>` +
            `<pre>${escapeHtml(this.loaded.text)}</pre>` +
            `<button type="button" class="pgn-viewer-link" data-action="copyPgn">${escapeHtml(this.t.copy)}</button>` +
            `</div></div>`
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
        this.context.addEventListener("keydown", (event) => {
            if (event.target.closest("pre") || event.altKey || event.ctrlKey || event.metaKey) {
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
        if (action === "togglePgn") {
            this._togglePgn()
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

    _togglePgn() {
        const button = this.elements.source.querySelector("[data-action=togglePgn]")
        const text = this.elements.source.querySelector(".pgn-viewer-source-text")
        text.hidden = !text.hidden
        button.textContent = text.hidden ? this.t.showPgn : this.t.hidePgn
        button.setAttribute("aria-expanded", String(!text.hidden))
    }

    _copyPgn() {
        const button = this.elements.source.querySelector("[data-action=copyPgn]")
        if (navigator.clipboard) {
            navigator.clipboard.writeText(this.loaded.text).then(() => {
                button.textContent = this.t.copied
                setTimeout(() => button.textContent = this.t.copy, 2000)
            })
        }
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
        // only the notation scrolls, never the page
        const container = this.elements.notation
        const top = element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
        const bottom = top + element.offsetHeight
        if (top < container.scrollTop + 8) {
            container.scrollTop = Math.max(0, top - 24)
        } else if (bottom > container.scrollTop + container.clientHeight - 8) {
            container.scrollTop = bottom - container.clientHeight + 24
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

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}
