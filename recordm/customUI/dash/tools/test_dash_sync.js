// End-to-end tests for dash-sync against a mock RecordM server.
// Run with: node tools/test_dash_sync.js   (Node >= 22)
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile, spawnSync } from 'node:child_process'
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
let created = null // the instance created by a POST, served afterwards like any other
let createdBodies = []
let dashboardDeleted = false // when true, the search endpoint stops listing the instance
const seenCookies = []

const server = http.createServer((req, res) => {
    let body = ""
    req.on("data", chunk => body += chunk)
    req.on("end", () => {
        seenCookies.push(req.headers.cookie || "")
        const instanceMatch = req.url.match(/^\/recordm\/recordm\/instances\/(\d+)$/)
        if (req.method === "GET" && req.url.startsWith("/recordm/recordm/definitions/search/name/Dashboard_v1")) {
            // ES search over the definition's instances, like the real endpoint (used by pull --all)
            const hits = dashboardDeleted ? [] : [{ _id: "" + instance.id }]
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify({ hits: { total: { value: hits.length }, hits } }))
        } else if (req.method === "GET" && req.url === "/recordm/recordm/definitions/name/Dashboard_v1") {
            // like the real endpoint: fieldDefinitions FLAT in pre-order, subtrees attached
            const flattenDefs = (defs) => defs.flatMap(d => [d, ...flattenDefs(d.fields || [])])
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify({ ...definition, fieldDefinitions: flattenDefs(definition.fieldDefinitions) }))
        } else if (req.method === "POST" && req.url === "/recordm/recordm/instances/") {
            const received = JSON.parse(body)
            createdBodies.push(received)
            assert.equal(received.type, "Dashboard_v1")
            assert.ok(!("id" in received) && !("version" in received), "create body must not carry id/version")
            const everyId = (fields) => fields.flatMap(f => [f.id, ...everyId(f.fields)])
            assert.ok(everyId(received.fields).every(id => id < 0), "create body must only carry placeholder (negative) ids")
            // like the server: placeholders become real ids, a first version is recorded
            let nextId = 700000
            const assign = (fields) => fields.map(f => ({ ...f, id: nextId++, fields: assign(f.fields) }))
            created = { id: 500001, version: 1, fields: assign(received.fields) }
            findFieldByName(created.fields, "Solution Sigla").value = "ACTV"
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify({ id: created.id, version: created.version }))
        } else if (req.method === "GET" && instanceMatch && created && instanceMatch[1] === "" + created.id) {
            res.setHeader("content-type", "application/json")
            res.end(JSON.stringify(created))
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

// pull --all discovers every Dashboard_v1 instance on the server (here: just this one)
const pulledAll = await runOk("pull", "--all")
assert.ok(pulledAll.stdout.includes("1 dashboards on the server: 1 pulled"), pulledAll.stdout)

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
assert.ok(unknown.stderr.includes("not found") && unknown.stderr.includes("'new <name>'"))

// without --server, the server is resolved from the cob-cli repo convention
// environments/<env>/server (default env: prod), with .cultofbits.com appended to bare names
mkdirSync(join(repoDir, "environments", "prod"), { recursive: true })
writeFileSync(join(repoDir, "environments", "prod", "server"), "dash-sync-test-name\n")
const resolved = await new Promise((done) => {
    execFile(process.execPath, [cliPath, "status"], { cwd: repoDir, env: { ...process.env, COB_TOKEN: "t" } },
        (error, stdout, stderr) => done({ stdout, stderr }))
})
assert.ok(resolved.stderr.includes("server: https://dash-sync-test-name.cultofbits.com"), resolved.stderr)

// dashboard deleted on the server -> pull --all removes the local dir (the working tree mirrors
// the server; git shows the deletion for the developer to confirm at commit time). Changes
// outside the git index block the removal even with --force (deleting them would be
// unrecoverable); staged changes don't (they live in the index and survive the removal)
const git = (...gitArgs) => {
    const result = spawnSync("git", ["-C", repoDir, "-c", "user.email=t@t", "-c", "user.name=t", ...gitArgs], { encoding: "utf8" })
    assert.equal(result.status, 0, "git " + gitArgs.join(" ") + " failed: " + result.stderr)
}
dashboardDeleted = true
git("init")
git("add", ".")
git("commit", "-m", "baseline")
writeFileSync(join(dashDir, "dashboard.yaml"), readFileSync(join(dashDir, "dashboard.yaml"), "utf8") + "# unstaged edit\n")
const kept = await runOk("pull", "--all", "--force")
assert.ok(kept.stderr.includes("kept 'Plan-Test'"), kept.stdout + kept.stderr)
assert.ok(existsSync(dashDir))
git("add", ".") // staging the edit makes it recoverable from the index -> removal allowed
const afterDelete = await runOk("pull", "--all")
assert.ok(afterDelete.stdout.includes("removed 'Plan-Test'"), afterDelete.stdout)
assert.ok(afterDelete.stdout.includes("0 dashboards on the server: 0 pulled, 1 removed"), afterDelete.stdout)
assert.ok(!existsSync(dashDir))

// ------------------------------------------------------------------------------------------ new
// the server no longer lists the old dashboard; the mock serves 458930 again for the clone source
dashboardDeleted = false
const dashboardsRoot = join(repoDir, "recordm", "customUI", "dashs")
const readCanonicalYaml = (dir) => YAML.parse(readFileSync(join(dashboardsRoot, dir, "dashboard.yaml"), "utf8"))

// empty skeleton: offline, no identity, refuses to overwrite
const skeleton = await runOk("new", "Brand New")
assert.ok(skeleton.stdout.includes("not on the server yet"))
assert.deepEqual(readCanonicalYaml("Brand-New"), { Name: "Brand New" })
assert.ok((await run("new", "Brand New")).stderr.includes("already exists"))
assert.ok((await runOk("status")).stdout.includes("➕ new (not pushed)  Brand-New"))
assert.ok((await runOk("validate", "Brand-New")).stdout.includes("not pushed"))
const noDiff = await run("diff", "Brand-New")
assert.equal(noDiff.status, 1)
assert.ok(noDiff.stderr.includes("was not pushed yet"))

// a dashboard born in the repo is not an orphan: pull --all must leave it alone
await runOk("pull", "--all")
assert.ok(existsSync(join(dashboardsRoot, "Brand-New")))

// dry-run builds a POST body without touching the server
const dry = await runOk("push", "Brand-New", "--dry-run")
assert.ok(dry.stdout.includes("dry-run: POST"), dry.stdout)
assert.equal(created, null)

// push of a new dashboard creates the instance and records instanceId/version in the same dir
const createPush = await runOk("push", "Brand-New")
assert.ok(createPush.stdout.includes("created 'Brand New' as instance 500001 v1"), createPush.stdout)
assert.ok(!createPush.stderr.includes("normalized"), "round-trip after create must be clean:\n" + createPush.stderr)
assert.equal(createdBodies.length, 1)
const brandNew = readCanonicalYaml("Brand-New")
assert.equal(String(brandNew.instanceId), "500001")
assert.equal(String(brandNew.version), "1")
assert.ok(!existsSync(join(dashboardsRoot, "Brand-New-500001")), "create must not leave a second directory")

// clone from a server instance: identity, component ids and $file images are left behind
// (the earlier pull --all already brought 458930 back, now that the server lists it again)
const sourceYaml = readFileSync(join(dashDir, "dashboard.yaml"), "utf8")
assert.ok(/^\s*id: /m.test(sourceYaml), "fixture has components with server ids")
const cloneRemote = await runOk("new", "Clone Remote", "--from", "458930", "--solution", "123")
assert.ok(cloneRemote.stderr.includes("$file image"), cloneRemote.stderr)
const remoteYaml = readFileSync(join(dashboardsRoot, "Clone-Remote", "dashboard.yaml"), "utf8")
assert.ok(!/^\s*(instanceId|version|id|Image): /m.test(remoteYaml), remoteYaml)
const cloneCanonical = readCanonicalYaml("Clone-Remote")
assert.equal(cloneCanonical.Name, "Clone Remote")
assert.equal(String(cloneCanonical.Solution), "123")
assert.equal(readCanonicalYaml("Plan-Test").Name, "Plan Test", "the source must stay untouched")
assert.equal(readCanonicalYaml("Plan-Test").instanceId !== undefined, true)

// clone from a local dir (no server access needed) copies the .hbs files too
const cloneLocal = await runOk("new", "Clone Local", "--from", "Plan-Test")
assert.ok(cloneLocal.stderr.includes("Solution/Order were copied"), cloneLocal.stderr)
assert.deepEqual(
    readdirSync(join(dashboardsRoot, "Clone-Local")).sort(),
    readdirSync(join(dashboardsRoot, "Plan-Test")).sort())

// the clone validates and pushes as a new dashboard: no duplicate ids, every field a placeholder
assert.ok((await runOk("validate", "Clone-Remote")).stdout.includes("0 erros"))
await runOk("push", "Clone-Remote")
assert.equal(createdBodies.length, 2)
assert.equal(String(readCanonicalYaml("Clone-Remote").instanceId), "500001")

server.close()
console.log("test_dash_sync: ALL TESTS PASSED")
