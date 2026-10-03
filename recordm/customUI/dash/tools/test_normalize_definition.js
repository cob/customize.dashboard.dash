// Tests for normalize_definition.js. Run with: node tools/test_normalize_definition.js   (Node >= 22)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEFAULT_TARGET, canonicalKeys, format, normalize, semanticChanges } from './normalize_definition.js'

const field = (name, extra = {}) => ({
    id: null, name, required: null, description: null,
    configuration: { description: null, keys: {}, extensions: {} },
    condition: null, visibilityCondition: null, duplicable: false, fields: [], order: 0,
    duplicablePath: false, descendents: [], rootField: false, restricted: false, defaultValue: null,
    ...extra,
})
const definition = (...fieldDefinitions) => ({ id: null, name: "Dashboard_v1", description: "@COB v1", duplicable: null, state: "enabled", fieldDefinitions, version: 1 })

// the same content with every object's keys in a pseudo-random order (seeded: reproducible)
let seed = 12345
const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
const shuffled = node => {
    if (Array.isArray(node)) return node.map(shuffled)
    if (!node || typeof node !== "object") return node
    const keys = Object.keys(node).sort(() => random() - 0.5)
    return Object.fromEntries(keys.map(key => [key, shuffled(node[key])]))
}

// ---- the repo file is a fixed point (this is also what `--check` verifies in CI)
const repoText = readFileSync(DEFAULT_TARGET, "utf8")
assert.equal(normalize(repoText), repoText, "dashboard_v1.json is not in the normalized format")

// ---- THE guarantee: whatever the key order of the export, the output is the same bytes
for (const reverse of [false, true]) {
    const exported = JSON.stringify(reverse ? shuffled(JSON.parse(repoText)) : JSON.parse(repoText))
    assert.equal(normalize(exported), repoText)
}
for (let i = 0; i < 5; i++) assert.equal(normalize(JSON.stringify(shuffled(JSON.parse(repoText)))), repoText)

// ---- a real change is the ONLY thing left in the output
const changed = JSON.parse(repoText)
changed.fieldDefinitions[1].required = "mandatory"
const normalized = normalize(JSON.stringify(shuffled(changed)))
const before = repoText.split("\n"), after = normalized.split("\n")
assert.equal(before.length, after.length)
assert.deepEqual(after.map((line, i) => line === before[i] ? null : line).filter(Boolean), ['      "required": "mandatory",'])

// ---- shapes not in the table (free-named maps, future shapes) are sorted alphabetically; arrays are never reordered
assert.deepEqual(canonicalKeys(["Select", "Multiple", "Help"]), ["Help", "Multiple", "Select"])
assert.deepEqual(canonicalKeys(["restricted", "id", "name", "required", "description", "configuration", "condition", "visibilityCondition", "duplicable", "fields", "order", "duplicablePath", "descendents", "rootField", "defaultValue"]).slice(0, 3), ["id", "name", "required"])
assert.equal(normalize('{"z":[3,1,2],"a":{"y":1,"x":2}}'), '{\n  "a": {\n    "x": 2,\n    "y": 1\n  },\n  "z": [\n    3,\n    1,\n    2\n  ]\n}\n')

// ---- format: 2 spaces, LF, single trailing newline, non-ASCII kept as is
assert.equal(format({ a: ["é"], b: [], c: {} }), '{\n  "a": [\n    "é"\n  ],\n  "b": [],\n  "c": {}\n}\n')

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

assert.deepEqual(semanticChanges(JSON.parse(repoText), shuffled(JSON.parse(repoText))), [])

console.log("test_normalize_definition: ok")
