// Brings a freshly exported RecordM definition into the repo with the minimum possible git diff.
//
// The server exports the definition minified and with a key order that depends on the server
// version/JVM (it has already flipped between releases), so a plain overwrite rewrites the whole
// file. Normalizing it against the version already in the repo (the "baseline") leaves only the
// real changes. See the README ("Updating the definition") for the rationale and the workflow.
//
//   node tools/normalize_definition.js <exported.json> [<target.json>]   write the normalized file
//   node tools/normalize_definition.js --check [<target.json>]           target is already normalized?
//
// <target.json> defaults to others/customize.dashboard.dash/definitions/dashboard_v1.json and is
// also the baseline (read before it is overwritten), so run it on a clean working tree.
import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const DEFAULT_TARGET = fileURLToPath(new URL('../../../../others/customize.dashboard.dash/definitions/dashboard_v1.json', import.meta.url))

const signature = object => Object.keys(object).sort().join("\0")

// Walks every object of the document (any depth, including the copies inside `descendents`)
const forEachObject = (node, visit) => {
    if (Array.isArray(node)) node.forEach(item => forEachObject(item, visit))
    else if (node && typeof node === "object") {
        visit(node)
        Object.values(node).forEach(value => forEachObject(value, visit))
    }
}

// key set -> the key order the baseline uses most for it. The order is learned from the baseline
// instead of hardcoded, so it follows whatever the repo already has (field definitions,
// `configuration.keys`, ...).
export const learnKeyOrders = baseline => {
    const votes = new Map() // signature -> Map(order joined -> {order, count})
    forEachObject(baseline, object => {
        const keys = Object.keys(object)
        const perOrder = votes.get(signature(object)) || new Map()
        const order = keys.join("\0")
        perOrder.set(order, { keys, count: (perOrder.get(order)?.count || 0) + 1 })
        votes.set(signature(object), perOrder)
    })
    const learned = new Map()
    for (const [sig, perOrder] of votes) {
        learned.set(sig, [...perOrder.values()].sort((a, b) => b.count - a.count)[0].keys)
    }
    return learned
}

const reorder = (node, learned) => {
    if (Array.isArray(node)) return node.map(item => reorder(item, learned))
    if (!node || typeof node !== "object") return node
    // key sets the baseline never saw (a genuinely new shape) keep the incoming order
    const keys = learned.get(signature(node)) || Object.keys(node)
    return Object.fromEntries(keys.map(key => [key, reorder(node[key], learned)]))
}

// Canonical text form: 2-space indent, no \u escapes, LF, one trailing newline.
// (JSON.stringify never escapes non-ASCII, so accents stay readable in the diff)
export const format = definition => JSON.stringify(definition, null, 2) + "\n"

export const normalize = (incomingText, baselineText) => {
    const incoming = JSON.parse(incomingText)
    const learned = baselineText ? learnKeyOrders(JSON.parse(baselineText)) : new Map()
    return format(reorder(incoming, learned))
}

// `order` (global pre-order index) and `descendents` (flattened copy of `fields`) are derived from
// the tree: they cascade over the whole file when a field is added, so they are not reported.
const DERIVED = new Set(["order", "descendents", "fields"])

// name -> field; a repeated sibling name gets a "#n" suffix so nothing is silently merged
const byName = fields => {
    const count = {}
    return new Map(fields.map(field => {
        count[field.name] = (count[field.name] || 0) + 1
        return [count[field.name] > 1 ? `${field.name}#${count[field.name]}` : field.name, field]
    }))
}

// Human readable list of the REAL differences between two definitions, by field path.
// Use it to confirm that the normalized diff only contains the intended changes.
export const semanticChanges = (before, after) => {
    const changes = []
    for (const key of ["name", "description", "duplicable", "state", "version"]) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changes.push(`${key}: ${JSON.stringify(before[key])} -> ${JSON.stringify(after[key])}`)
    }
    const compare = (beforeFields, afterFields, path) => {
        const b = byName(beforeFields), a = byName(afterFields)
        for (const name of b.keys()) if (!a.has(name)) changes.push(`removed: ${[...path, name].join(" > ")}`)
        for (const [name, field] of a) {
            const where = [...path, name].join(" > ")
            if (!b.has(name)) { changes.push(`added:   ${where}`); continue }
            const old = b.get(name)
            for (const prop of new Set([...Object.keys(old), ...Object.keys(field)])) {
                if (DERIVED.has(prop)) continue
                if (JSON.stringify(old[prop]) !== JSON.stringify(field[prop])) changes.push(`changed: ${where} .${prop}: ${JSON.stringify(old[prop])} -> ${JSON.stringify(field[prop])}`)
            }
            compare(old.fields, field.fields, [...path, name])
        }
    }
    compare(before.fieldDefinitions, after.fieldDefinitions, [])
    return changes
}

// relative paths are resolved from the current directory (recordm/customUI/dash when run via npm)
const readOrExit = (path, what) => {
    try {
        return readFileSync(path, "utf8")
    } catch (error) {
        console.error(`Cannot read ${what} '${path}' (${error.code}). Relative paths are resolved from ${process.cwd()}`)
        process.exit(2)
    }
}

const main = args => {
    const check = args[0] === "--check"
    const [input, target = DEFAULT_TARGET] = check ? [null, ...args.slice(1)] : args
    if (!check && !input) {
        console.error("usage: normalize_definition.js <exported.json> [<target.json>]\n       normalize_definition.js --check [<target.json>]")
        process.exit(2)
    }
    const baselineText = readOrExit(target, "target")
    if (check) {
        if (normalize(baselineText, baselineText) !== baselineText) {
            console.error(`${target} is not in the normalized format (run: node tools/normalize_definition.js <file> to fix)`)
            process.exit(1)
        }
        console.log(`${target}: normalized`)
        return
    }
    const inputText = readOrExit(input, "exported definition")
    if (realpathSync(input) === realpathSync(target)) {
        console.error(`'${input}' is the target itself: pass the file exported from the server as the first argument`)
        process.exit(2)
    }
    const normalized = normalize(inputText, baselineText)
    const changes = semanticChanges(JSON.parse(baselineText), JSON.parse(normalized))
    writeFileSync(target, normalized)
    console.log(`${target} written. Real differences vs the previous version (${changes.length}):`)
    changes.forEach(change => console.log("  " + change))
    console.log("\nReview with: git diff --stat -- " + target)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
