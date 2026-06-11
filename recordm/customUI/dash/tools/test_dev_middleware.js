// Tests for dev_middleware.js (local dashboards in the dev server).
// Run with: node tools/test_dev_middleware.js   (Node >= 22)
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { serializeDashboard, parseDashboardFull } from '../src/serializer.js'
import { explodeDashboard, writeDashboardDir, stripDerived } from '../src/repo_format.js'
import { c0, loadNumberedDefinition } from '../src/test_fixture.js'

const require = createRequire(import.meta.url)
const installLocalDashboards = require('./dev_middleware.js')

const definition = loadNumberedDefinition()

// mock server only used for the Dashboard_v1 definition fetch
const definitionRequests = []
const mockServer = http.createServer((req, res) => {
    definitionRequests.push({ url: req.url, cookie: req.headers.cookie })
    res.end(JSON.stringify(definition))
})
await new Promise(done => mockServer.listen(0, "127.0.0.1", done))
const serverUrl = "http://127.0.0.1:" + mockServer.address().port

// dashboards dir with the fixture dashboard (id 458930)
const dashboardsDir = mkdtempSync(join(tmpdir(), "dash-mw-"))
const canonical = parseDashboardFull(serializeDashboard(c0, definition))
writeDashboardDir(join(dashboardsDir, "Plan-Test"), explodeDashboard(canonical))

// fake express app / webpack-dev-server
const routes = {}
const fakeApp = { get: (route, handler) => routes[route] = handler }
const sockWrites = []
const fakeServer = { sockets: [], sockWrite: (sockets, type) => sockWrites.push(type) }

const installed = installLocalDashboards(fakeApp, fakeServer, { dashboardsDir, serverUrl })
assert.equal(installed, true)
assert.ok(routes['/recordm/recordm/instances/:id'], "instance route not registered")

const callRoute = (id) => new Promise((done) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this },
        json(payload) { done({ kind: "json", statusCode: this.statusCode, payload }) },
    }
    routes['/recordm/recordm/instances/:id']({ params: { id }, headers: { cookie: "sessionid=abc" } }, res, () => done({ kind: "next" }))
})

// a locally represented dashboard is served from the repo files...
const served = await callRoute("458930")
assert.equal(served.kind, "json")
assert.equal(served.statusCode, 200)
assert.equal(served.payload.id, 458930)
// ...is exactly what the production pipeline would see after a push...
assert.deepEqual(stripDerived(parseDashboardFull(served.payload)), stripDerived(structuredClone(canonical)))
// ...and the definition was fetched from the server reusing the browser session cookie
assert.equal(definitionRequests.length, 1)
assert.equal(definitionRequests[0].cookie, "sessionid=abc")

// the definition fetch is cached
await callRoute("458930")
assert.equal(definitionRequests.length, 1)

// dashboards NOT in the repo fall through to the normal proxy
assert.equal((await callRoute("999999")).kind, "next")

// a broken local representation fails loud (500), instead of silently serving the server's
// version: break an @file reference by removing the .hbs file it points to
const hbsFile = readdirSync(join(dashboardsDir, "Plan-Test")).find(f => f.endsWith(".hbs"))
rmSync(join(dashboardsDir, "Plan-Test", hbsFile))
await new Promise(r => setTimeout(r, 300)) // give fs.watch time to invalidate the index
const broken = await callRoute("458930")
assert.equal(broken.kind, "json")
assert.equal(broken.statusCode, 500)
assert.ok(broken.payload.error.includes(hbsFile))

// and the file change triggered a browser reload through the dev-server websocket
assert.ok(sockWrites.includes("content-changed"))

// webpack-dev-server v4 (cob-cli) uses sendMessage/webSocketServer instead of sockWrite
const v4Messages = []
const v4App = { get: () => {} }
const v4Server = { sendMessage: (clients, type) => v4Messages.push(type), webSocketServer: { clients: [] } }
assert.equal(installLocalDashboards(v4App, v4Server, { dashboardsDir, serverUrl }), true)
rmSync(join(dashboardsDir, "Plan-Test", "dashboard.json"))
await new Promise(r => setTimeout(r, 400))
assert.ok(v4Messages.includes("static-changed"))

mockServer.close()
console.log("test_dev_middleware: ALL TESTS PASSED")
process.exit(0) // fs.watch keeps the loop alive
