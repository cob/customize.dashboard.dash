// Tests for normalize_definition.js. Run with: node tools/test_normalize_definition.js   (Node >= 22)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEFAULT_TARGET, format, learnKeyOrders, normalize, semanticChanges } from './normalize_definition.js'

const field = (name, extra = {}) => ({
    id: null, name, required: null, description: null,
    configuration: { description: null, keys: {}, extensions: {} },
    condition: null, visibilityCondition: null, duplicable: false, fields: [], order: 0,
    duplicablePath: false, descendents: [], rootField: false, restricted: false, defaultValue: null,
    ...extra,
})
const definition = (...fieldDefinitions) => ({ id: null, name: "Dashboard_v1", description: "@COB v1", duplicable: null, state: "enabled", fieldDefinitions, version: 1 })

// the same objects with the key order a different server release would emit
const shuffled = node => {
    if (Array.isArray(node)) return node.map(shuffled)
    if (!node || typeof node !== "object") return node
    return Object.fromEntries(Object.keys(node).reverse().map(key => [key, shuffled(node[key])]))
}

// ---- the repo file is a fixed point (this is also what `--check` verifies in CI)
const repoText = readFileSync(DEFAULT_TARGET, "utf8")
assert.equal(normalize(repoText, repoText), repoText, "dashboard_v1.json is not in the normalized format")

// ---- minified + shuffled keys (what the server exports) normalizes back to the baseline, byte for byte
const exported = JSON.stringify(shuffled(JSON.parse(repoText)))
assert.ok(!exported.includes("\n"))
assert.equal(normalize(exported, repoText), repoText)

// ---- idempotent
const once = normalize(exported, repoText)
assert.equal(normalize(once, once), once)

// ---- a real change is the ONLY thing left in the output
const changed = JSON.parse(repoText)
changed.fieldDefinitions[1].required = "mandatory"
const normalized = normalize(JSON.stringify(shuffled(changed)), repoText)
const before = repoText.split("\n"), after = normalized.split("\n")
assert.equal(before.length, after.length)
assert.deepEqual(after.map((line, i) => line === before[i] ? null : line).filter(Boolean), ['      "required": "mandatory",'])

// ---- format: 2 spaces, LF, single trailing newline, non-ASCII kept as is
assert.equal(format({ a: ["é"], b: [], c: {} }), '{\n  "a": [\n    "é"\n  ],\n  "b": [],\n  "c": {}\n}\n')

// ---- key order is learned per key set: the most used order of the baseline wins, unseen shapes keep the incoming order
const learned = learnKeyOrders({ x: [{ b: 1, a: 2 }, { b: 3, a: 4 }, { a: 5, b: 6 }], y: { c: 1, d: 2, e: 3 } })
assert.deepEqual(learned.get("a\0b"), ["b", "a"])
assert.equal(normalize('{"new":1,"shape":2,"x":[{"a":1,"b":2}]}', '{"x":[{"b":1,"a":2}]}'), '{\n  "new": 1,\n  "shape": 2,\n  "x": [\n    {\n      "b": 2,\n      "a": 1\n    }\n  ]\n}\n')

// ---- semantic report: real differences only, by field path; derived order/descendents ignored
const base = definition(field("Board", { fields: [field("Link"), field("Text")] }))
const next = definition(field("Board", { fields: [field("Link", { required: "mandatory", order: 7 }), field("Extra")], descendents: [field("x")] }))
next.description = "@COB v2"
assert.deepEqual(semanticChanges(base, next), [
    'description: "@COB v1" -> "@COB v2"',
    'removed: Board > Text',
    'changed: Board > Link .required: null -> "mandatory"',
    'added:   Board > Extra',
])

console.log("test_normalize_definition: ok")
