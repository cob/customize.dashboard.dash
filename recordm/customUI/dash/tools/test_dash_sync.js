// End-to-end tests for dash-sync against a mock RecordM server.
// Run with: node tools/test_dash_sync.js   (Node >= 22)
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import YAML from 'yaml'
import { serializeDashboard } from '../src/serializer.js'
import { c0, loadNumberedDefinition } from '../src/test_fixture.js'

const definition = loadNumberedDefinition()

// ------------------------------------------------------------------------- mock RecordM server
// state: one Dashboard_v1 instance, like RecordM would serve it
let instance = serializeDashboard(c0, definition) // id 458930, version 7
// server-owned $auto field (computed by RecordM from the Solution ref, not in the canonical):
// a push must return it with the server's value, not null (else 400 NOT_DUPLICABLE_FIELD)
const findFieldByName = (fields, name) => {
    for (const field of fields) {
        if (field.fieldDefinition.name === name) return field
        const found = findFieldByName(field.fields, name)
        if (found) return found
    }
    return null
}
findFieldByName(instance.fields, "Solution Sigla").value = "ACTV"
const seenCookies = []

const server = http.createServer((req, res) => {
    let body = ""
    req.on("data", chunk => body += chunk)
    req.on("end", () => {
        seenCookies.push(req.headers.cookie || "")
        const instanceMatch = req.url.match(/^\/recordm\/recordm\/instances\/(\d+)$/)
        if (req.method === "GET" && req.url === "/recordm/recordm/definitions/name/Dashboard_v1") {
            // like the real endpoint: fieldDefinitions FLAT in pre-order, subtrees attached
            const flattenDefs = (defs) => defs.flatMap(d => [d, ...flattenDefs(d.fields || [])])
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify({ ...definition, fieldDefinitions: flattenDefs(definition.fieldDefinitions) }))
        } else if (req.method === "GET" && instanceMatch && instanceMatch[1] === "" + instance.id) {
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify(instance))
        } else if (req.method === "PUT" && instanceMatch && instanceMatch[1] === "" + instance.id) {
            // the PUT body must stay small: no definition subtrees/descendents per field (a real
            // push with the full definition embedded got a 413 from nginx)
            assert.ok(!body.includes('"descendents"'), "PUT body carries definition descendents")
            assert.ok(body.length < 500 * 1024, "PUT body is " + Math.round(body.length / 1024) + " KB")
            const received = JSON.parse(body)
            assert.equal(findFieldByName(received.fields, "Solution Sigla").value, "ACTV",
                "PUT body must return server-owned $auto values untouched")
            instance = { ...received, version: received.version + 1 } // save bumps the version
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify({ id: instance.id, version: instance.version }))
        } else {
            res.statusCode = 404
            res.end("not found: " + req.method + " " + req.url)
        }
    })
})
await new Promise(done => server.listen(0, "127.0.0.1", done))
const baseUrl = "http://127.0.0.1:" + server.address().port

// ------------------------------------------------------------------------------ CLI test setup
const repoDir = mkdtempSync(join(tmpdir(), "dash-sync-repo-"))
const cliPath = new URL('./dash-sync.js', import.meta.url).pathname

// async runner: the mock server lives in this same process, so the CLI must run without
// blocking the event loop (spawnSync would deadlock waiting for our own http responses)
function run(...cliArgs) {
    return new Promise((done) => {
        execFile(process.execPath, [cliPath, ...cliArgs, "--server", baseUrl], {
            cwd: repoDir,
            env: { ...process.env, COB_TOKEN: "test-token" },
        }, (error, stdout, stderr) => done({ status: error ? error.code ?? 1 : 0, stdout, stderr }))
    })
}
async function runOk(...cliArgs) {
    const result = await run(...cliArgs)
    assert.equal(result.status, 0, "dash-sync " + cliArgs.join(" ") + " failed:\n" + result.stdout + result.stderr)
    return result
}

const dashDir = join(repoDir, "recordm", "customUI", "dashs", "Plan-Test")
const localVersion = () => YAML.parse(readFileSync(join(dashDir, "dashboard.yaml"), 'utf8')).version

// --------------------------------------------------------------------------------------- tests

// pull brings the dashboard into dashboards/<Name slug>/, exploded
await runOk("pull", "458930")
assert.ok(existsSync(join(dashDir, "dashboard.yaml")))
assert.equal(localVersion(), "7")
const hbsFiles = readdirSync(dashDir).filter(f => f.endsWith(".hbs"))
assert.ok(hbsFiles.length >= 1)
assert.ok(seenCookies.every(c => c === "" || c.includes("cobtoken=test-token")))

// freshly pulled -> in sync
assert.ok((await runOk("status")).stdout.includes("✓ in sync (v7)  Plan-Test"))

// edit a multiline field in the repo -> push needed
const mdFile = hbsFiles.find(f => f.includes("MDContent"))
writeFileSync(join(dashDir, mdFile), readFileSync(join(dashDir, mdFile), 'utf8') + "\nEDITADO NO REPO")
assert.ok((await runOk("status")).stdout.includes("↑ push needed"))

// diff shows the change (exits 1, like git diff) and identifies the file
const diff = await run("diff", "Plan-Test")
assert.equal(diff.status, 1, diff.stdout + diff.stderr)
assert.ok(diff.stdout.includes("EDITADO NO REPO"))

// dry-run does not touch the server
await runOk("push", "Plan-Test", "--dry-run")
assert.equal(instance.version, 7)

// push: optimistic-locking ok -> server bumps to v8, local records it (implicit pull)
const push = await runOk("push", "Plan-Test")
assert.ok(push.stdout.includes("pushed 'Plan Test' v7 -> v8"))
assert.ok(!push.stderr.includes("normalized"), "round-trip after push must be clean:\n" + push.stderr)
assert.equal(instance.version, 8)
assert.equal(localVersion(), "8")
assert.ok(JSON.stringify(instance).includes("EDITADO NO REPO"))
assert.ok((await runOk("status")).stdout.includes("✓ in sync (v8)"))

// someone edits in the app (version moves on) -> status says pull, push refuses
instance = { ...instance, version: 9 }
assert.ok((await runOk("status")).stdout.includes("↓ pull needed (local v8, server v9)"))
const conflict = await run("push", "Plan-Test")
assert.equal(conflict.status, 1)
assert.ok(conflict.stderr.includes("server is at v9"))

// pull again converges (repo dir is not a git repo here, so the safety check just warns)
await runOk("pull", "458930")
assert.equal(localVersion(), "9")
assert.ok((await runOk("status")).stdout.includes("✓ in sync (v9)"))

// push by instanceId also works, and unknown dashboards are rejected with guidance
const unknown = await run("push", "999999")
assert.equal(unknown.status, 1)
assert.ok(unknown.stderr.includes("created in the app"))

// without --server, the server is resolved from the cob-cli repo convention
// environments/<env>/server (default env: prod), with .cultofbits.com appended to bare names
mkdirSync(join(repoDir, "environments", "prod"), { recursive: true })
writeFileSync(join(repoDir, "environments", "prod", "server"), "dash-sync-test-name\n")
const resolved = await new Promise((done) => {
    execFile(process.execPath, [cliPath, "status"], { cwd: repoDir, env: { ...process.env, COB_TOKEN: "t" } },
        (error, stdout, stderr) => done({ stdout, stderr }))
})
assert.ok(resolved.stderr.includes("server: https://dash-sync-test-name.cultofbits.com"), resolved.stderr)

server.close()
console.log("test_dash_sync: ALL TESTS PASSED")
