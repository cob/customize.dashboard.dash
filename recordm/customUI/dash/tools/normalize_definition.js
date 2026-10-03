// Brings a freshly exported RecordM definition into the repo with the minimum possible git diff.
//
// The server exports the definition minified and with a key order that depends on the server
// version/JVM (it has already flipped between releases), so a plain overwrite rewrites the whole
// file. The output here is a CANONICAL form: same content => same bytes, whatever the order of the
// export and whatever is in the working tree. See the README ("Updating the definition").
//
//   node tools/normalize_definition.js <exported.json> [<target.json>]   write the normalized file
//   node tools/normalize_definition.js --check [<target.json>]           target is already normalized?
//
// <target.json> defaults to others/customize.dashboard.dash/definitions/dashboard_v1.json; it is
// read before being overwritten only to report the real differences against it.
import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const DEFAULT_TARGET = fileURLToPath(new URL('../../../../others/customize.dashboard.dash/definitions/dashboard_v1.json', import.meta.url))

const signature = keys => [...keys].sort().join("\0")

// Canonical key order of every object shape the definition has. It is fixed in the code on purpose:
// the output must not depend on the order of the export (it changes between server releases) NOR
// on the file that is already in the working tree. Any object whose key set is not listed here
// (the free-named maps `configuration.keys` / `configuration.extensions`, a shape that does not
// exist yet) is sorted alphabetically, which is deterministic too.
const KEY_ORDER = new Map([
    // definition root
    ["id", "name", "description", "duplicable", "state", "fieldDefinitions", "version"],
    // field definition
    ["id", "name", "required", "description", "configuration", "condition", "visibilityCondition", "duplicable", "fields", "order", "duplicablePath", "descendents", "rootField", "restricted", "defaultValue"],
    ["description", "keys", "extensions"], // configuration
    ["type", "value", "matcher"], // visibilityCondition
    ["type", "name"], // visibilityCondition.matcher
    ["source_field", "field_name"], // configuration.keys.AutoRefField.args
    ["query", "definition"], // configuration.keys.Reference.args
].map(order => [signature(order), order]))

export const canonicalKeys = keys => KEY_ORDER.get(signature(keys)) || [...keys].sort()

const reorder = node => {
    if (Array.isArray(node)) return node.map(reorder) // arrays are ordered content: never touched
    if (!node || typeof node !== "object") return node
    return Object.fromEntries(canonicalKeys(Object.keys(node)).map(key => [key, reorder(node[key])]))
}

// Canonical text form: 2-space indent, no \u escapes, LF, one trailing newline.
// (JSON.stringify never escapes non-ASCII, so accents stay readable in the diff)
export const format = definition => JSON.stringify(definition, null, 2) + "\n"

export const normalize = incomingText => format(reorder(JSON.parse(incomingText)))

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
    // key order is not content: compare (and print) every value in canonical key order
    const same = (x, y) => JSON.stringify(reorder(x)) === JSON.stringify(reorder(y))
    const show = value => JSON.stringify(reorder(value))
    for (const key of ["name", "description", "duplicable", "state", "version"]) {
        if (!same(before[key], after[key])) changes.push(`${key}: ${show(before[key])} -> ${show(after[key])}`)
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
                if (!same(old[prop], field[prop])) changes.push(`changed: ${where} .${prop}: ${show(old[prop])} -> ${show(field[prop])}`)
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
        if (normalize(baselineText) !== baselineText) {
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
    const normalized = normalize(inputText)
    const changes = semanticChanges(JSON.parse(baselineText), JSON.parse(normalized))
    writeFileSync(target, normalized)
    console.log(`${target} written. Real differences vs the previous version (${changes.length}):`)
    changes.forEach(change => console.log("  " + change))
    console.log("\nReview with: git diff --stat -- " + target)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
