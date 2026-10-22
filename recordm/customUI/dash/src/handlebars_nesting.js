// Gives each line of a highlighted handlebars block the nesting level of its block tags.
// Markdown.vue colors the tags by that level.
// It counts tags instead of using Handlebars.parse, so an unbalanced template still renders.

// Comments match first, so a commented '{{#if}}' does not count.
// '{{#x' and '{{^x' open a block and '{{/x' closes it.
// '{{else' and '{{^}}' stay at the level of their block.
const TAG_RE = /\{\{!--[\s\S]*?--\}\}|\{\{![\s\S]*?\}\}|\{\{~?\s*(\^\s*~?\}\}|else(?=[\s~}])|[#^/])/g
const SPAN_RE = /<span[^>]*>|<\/span>/g

const LEVEL_COLORS = 5

// A line takes the lowest level it reaches.
// This puts '{{#if}}', '{{else}}' and '{{/if}}' at the same level.
// Errors are the lines with an open, close or else that has no match.
export function blockDepths(code) {
    const lineCount = code.split("\n").length
    const depths = []
    const errors = new Set()
    const opened = []   // line of each open block
    let depth = 0
    let line = 0
    let lineEnd = code.indexOf("\n")

    // Lines without tags keep the current depth.
    const visit = (target, level) => {
        while (depths.length <= target) depths.push(depth)
        depths[target] = Math.min(depths[target], level)
    }

    for (const match of code.matchAll(TAG_RE)) {
        const kind = match[1]
        if (!kind) continue  // comment
        while (lineEnd !== -1 && lineEnd < match.index) {
            line++
            lineEnd = code.indexOf("\n", lineEnd + 1)
        }
        visit(line, depth)
        if (kind === "#" || kind === "^") {
            opened.push(line)
            depth++
        } else if (depth === 0) {
            errors.add(line)
        } else if (kind === "/") {
            opened.pop()
            depth--
            visit(line, depth)
        } else {
            visit(line, depth - 1)
        }
    }
    visit(lineCount - 1, depth)
    opened.forEach(l => errors.add(l))

    return { depths, errors }
}

// A span can cross lines, like a multiline '{{!-- --}}'.
// It closes at the end of each line and opens again on the next one.
function htmlLines(html) {
    const open = []
    return html.split("\n").map(line => {
        const prefix = open.join("")
        ;(line.match(SPAN_RE) || []).forEach(tag => tag === "</span>" ? open.pop() : open.push(tag))
        return prefix + line + "</span>".repeat(open.length)
    })
}

export function decorateNesting(code, html) {
    const { depths, errors } = blockDepths(code)
    return htmlLines(html)
        .map((line, i) => {
            const classes = "hb-level-" + ((depths[i] || 0) % LEVEL_COLORS) + (errors.has(i) ? " hb-error" : "")
            return `<span class="${classes}">${line}</span>`
        })
        .join("\n")
}
