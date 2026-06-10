// Tests for repo_format.js (the dashboards-as-code directory format).
// Run with: node src/test_repo_format.js   (Node >= 22)
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { serializeDashboard, parseDashboardFull } from './serializer.js'
import { explodeDashboard, implodeDashboard, writeDashboardDir, listDashboardDirs, stripDerived, slugify } from './repo_format.js'
import { c0, loadNumberedDefinition } from './test_fixture.js'

const definition = loadNumberedDefinition()

// a realistic canonical: the fixture after a server round-trip (with residues, Dash, ids, ...)
const c1 = parseDashboardFull(serializeDashboard(c0, definition))

// ---------------------------------------------------------------------------------------------
// explode: multiline strings (and only those) become .hbs files referenced from dashboard.json
// ---------------------------------------------------------------------------------------------
const files = explodeDashboard(c1)
const hbsFiles = Object.keys(files).filter(f => f.endsWith(".hbs"))
assert.ok(hbsFiles.length >= 1)
assert.ok("dashboard.json" in files)

// the multiline MDContent of the Markdown component went to a file with a readable name
const mdFile = hbsFiles.find(f => f.includes("Markdown") && f.includes("MDContent"))
assert.ok(mdFile, "expected a .hbs file for the Markdown MDContent, got: " + hbsFiles.join(", "))
assert.equal(files[mdFile], "## Relatório\ncom **markdown** e\nvárias linhas")
assert.ok(files["dashboard.json"].includes('"@file:' + mdFile + '"'))

// single-line values stay inline (Context in the fixture is single-line)
assert.ok(files["dashboard.json"].includes('"Width": "w-full"'))

// derived keys are stripped from the stored representation
assert.ok(!files["dashboard.json"].includes('"Dash"'))

// ---------------------------------------------------------------------------------------------
// write + implode: the directory reads back to the canonical (minus derived keys)
// ---------------------------------------------------------------------------------------------
const dashboardsRoot = mkdtempSync(join(tmpdir(), "dash-repo-"))
const dashDir = join(dashboardsRoot, slugify(c1.Name))
writeDashboardDir(dashDir, files)

const imploded = implodeDashboard(dashDir)
assert.deepEqual(imploded, stripDerived(structuredClone(c1)))

// determinism: exploding the imploded canonical produces exactly the same files
assert.deepEqual(explodeDashboard(imploded), files)

// listDashboardDirs identifies the dashboard by instanceId/version
const listed = listDashboardDirs(dashboardsRoot)
assert.equal(listed.length, 1)
assert.equal(listed[0].instanceId, "458930")
assert.equal(listed[0].version, "7")

// ---------------------------------------------------------------------------------------------
// stale .hbs files from previous versions are removed on write
// ---------------------------------------------------------------------------------------------
writeFileSync(join(dashDir, "stale-leftover.hbs"), "old content")
writeDashboardDir(dashDir, explodeDashboard(imploded))
assert.ok(!existsSync(join(dashDir, "stale-leftover.hbs")))
assert.deepEqual(implodeDashboard(dashDir), imploded)

// ---------------------------------------------------------------------------------------------
// values that literally start with "@file:" are externalized too (no ambiguity on implode)
// ---------------------------------------------------------------------------------------------
const tricky = structuredClone(imploded)
tricky.Description = "@file:not-a-real-ref.hbs"
const trickyFiles = explodeDashboard(tricky)
assert.ok(Object.values(trickyFiles).includes("@file:not-a-real-ref.hbs"))
const trickyDir = join(dashboardsRoot, "tricky")
writeDashboardDir(trickyDir, trickyFiles)
assert.equal(implodeDashboard(trickyDir).Description, "@file:not-a-real-ref.hbs")

console.log("test_repo_format: ALL TESTS PASSED")
