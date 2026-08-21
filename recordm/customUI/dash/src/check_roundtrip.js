// Checks that a real dashboard instance survives the parse/serialize round-trip, i.e. that the
// canonical (repo) representation captures everything the app reads from it.
//
// Usage:
//   node src/check_roundtrip.js <instance.json> <definition.json>
//
// where (saved with an authenticated browser session):
//   instance.json   = GET https://<server>/recordm/recordm/instances/<dashboardId>
//   definition.json = GET https://<server>/recordm/recordm/definitions/name/Dashboard_v1
//                     (must come from the server: the serializer needs the real field ids)
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { parseDashboard } from './collector.js'
import { serializeDashboard, parseDashboardExtras } from './serializer.js'

const [rawFile, defFile] = process.argv.slice(2)
if (!rawFile || !defFile) {
    console.error("Usage: node src/check_roundtrip.js <instance.json> <definition.json>")
    process.exit(1)
}

const raw = JSON.parse(readFileSync(rawFile, 'utf8'))
const definition = JSON.parse(readFileSync(defFile, 'utf8'))

const parseFull = (r) => ({ ...parseDashboard(r), ...parseDashboardExtras(r) })

const c1 = parseFull(raw)                                  // what the app sees today
const c2 = parseFull(serializeDashboard(c1, definition))   // after a repo round-trip

try {
    assert.deepStrictEqual(c2, c1)
} catch (e) {
    console.error("ROUND-TRIP MISMATCH for '" + c1.Name + "' (instance " + c1.instanceId + ", v" + c1.version + "):\n")
    console.error(e.message)
    process.exit(1)
}
console.log("OK: round-trip estável para '" + c1.Name + "' (instance " + c1.instanceId + ", v" + c1.version + ")")
