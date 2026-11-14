/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn-viewer
 * License: MIT, see file 'LICENSE'
 *
 * The move assessments of the PGN standard ($1 to $6). They colour the frame
 * of the move on the board and the symbol in the notation, see the classes
 * in assets/cm-pgn-viewer.css.
 */
export const MOVE_QUALITY = {
    1: "good",          // !
    2: "mistake",       // ?
    3: "brilliant",     // !!
    4: "blunder",       // ??
    5: "interesting",   // !?
    6: "dubious"        // ?!
}

// cm-chessboard marker types, the frame of MARKER_TYPE.frame, the class defines the colour
export const MOVE_MARKER_TYPE = {
    good: {class: "marker-pgn-good", slice: "markerFrame"},
    mistake: {class: "marker-pgn-mistake", slice: "markerFrame"},
    brilliant: {class: "marker-pgn-brilliant", slice: "markerFrame"},
    blunder: {class: "marker-pgn-blunder", slice: "markerFrame"},
    interesting: {class: "marker-pgn-interesting", slice: "markerFrame"},
    dubious: {class: "marker-pgn-dubious", slice: "markerFrame"}
}

// a dark line along the inside of the coloured frame, so it stands out on every square
export const MOVE_MARKER_CONTOUR = {class: "marker-pgn-contour", slice: "cmPgnViewerMarkerContour"}

// The corners of the cm-chessboard frame marker (assets/extensions/markers/markers.svg,
// MIT, Stefan Haack), moved slightly inwards: a dark line along the inner edge of the
// coloured assessment frame. Put into the page once and referenced by the marker type
// MOVE_MARKER_CONTOUR, so it scales with the board like every marker.
const CONTOUR_PATHS = [
    `<path d="M2.66453526e-15,10.5882353 L2.66453526e-15,2.11764706 C2.66453526e-15,1.41176471 0.176470588,0.882352941 0.529411765,0.529411765 C0.882352941,0.176470588 1.41176471,-2.84217094e-14 2.11764706,-2.84217094e-14 L10.5882353,-2.84217094e-14"/>`,
    `<path d="M25.4117647,36 L25.4117647,27.5294118 C25.4117647,26.8235294 25.5882353,26.2941176 25.9411765,25.9411765 C26.2941176,25.5882353 26.8235294,25.4117647 27.5294118,25.4117647 L36,25.4117647" transform="translate(30.705882, 30.705882) rotate(-180.000000) translate(-30.705882, -30.705882) "/>`,
    `<path d="M0,36 L0,27.5294118 C0,26.8235294 0.176470588,26.2941176 0.529411765,25.9411765 C0.882352941,25.5882353 1.41176471,25.4117647 2.11764706,25.4117647 L10.5882353,25.4117647" transform="translate(5.294118, 30.705882) rotate(-90.000000) translate(-5.294118, -30.705882) "/>`,
    `<path d="M25.4117647,10.5882353 L25.4117647,2.11764706 C25.4117647,1.41176471 25.5882353,0.882352941 25.9411765,0.529411765 C26.2941176,0.176470588 26.8235294,0 27.5294118,0 L36,0" transform="translate(30.705882, 5.294118) rotate(-270.000000) translate(-30.705882, -5.294118) "/>`
]
export const CONTOUR_SLICE = "cmPgnViewerMarkerContour"

export function addContourSprite() {
    if (typeof document === "undefined" || document.getElementById(CONTOUR_SLICE)) {
        return
    }
    const wrapper = document.createElement("div")
    wrapper.style.position = "absolute"
    wrapper.style.transform = "scale(0)"
    wrapper.setAttribute("aria-hidden", "true")
    wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><g id="${CONTOUR_SLICE}" ` +
        `transform="translate(20 20) scale(0.9) translate(-20 -20) translate(2 2)" fill-opacity="0">` +
        CONTOUR_PATHS.join("") + `</g></svg>`
    document.body.appendChild(wrapper)
}


/** "good", "mistake", ... or undefined, if the move has no assessment */
export function moveQuality(move) {
    for (const nag of (move && move.nags) || []) {
        if (MOVE_QUALITY[nag]) {
            return MOVE_QUALITY[nag]
        }
    }
    return undefined
}
