#!/usr/bin/env node
// dash-sync: keeps dashboards represented in a git repo ("dashboards as code") in sync with the
// Dashboard_v1 instances of a RecordM server. Dashboards are always CREATED in the application;
// the repo only manages existing ones (the only way in is `pull`).
//
// Usage:
//   node tools/dash-sync.js pull <instanceId> [--force]
//   node tools/dash-sync.js push <dir|instanceId> [--dry-run] [--force]
//   node tools/dash-sync.js diff <dir|instanceId>
//   node tools/dash-sync.js status
//
// Options:
//   --server <url>   RecordM server (default: resolved from the cob-cli repo, see below)
//   --env <name>     cob-cli environment to resolve the server from (default: prod)
//   --dir <path>     dashboards directory (default: <repo root>/dashboards)
//   --force          pull: overwrite uncommitted local changes; push: ignore server version check
//   --dry-run        push: write the PUT body to a temp file instead of sending it
//
// Server resolution order: --server, COB_SERVER, environments/<env>/server (cob-cli convention,
// name gets ".cultofbits.com" appended unless it already contains a dot), .server (legacy repos).
//
// Auth (env): COB_TOKEN (cobtoken cookie) or COB_USERNAME/COB_PASSWORD (otherwise prompted)
//
// Sync model: the canonical representation carries its own identity — `instanceId` and `version`
// ("this representation corresponds to version N of the instance"). push requires the server to
// still be at version N (optimistic locking) and ends with an implicit pull, recording N+1. Local
// uncommitted changes are git's responsibility: pull refuses to overwrite them without --force.
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { isDeepStrictEqual } from 'node:util'
import readline from 'node:readline'
import { parseDashboardFull, serializeDashboard, adoptFieldIds } from '../src/serializer.js'
import { explodeDashboard, implodeDashboard, writeDashboardDir, listDashboardDirs, stripDerived, slugify } from '../src/repo_format.js'

const INSTANCES_PATH = "/recordm/recordm/instances/"
const DEFINITION_PATH = "/recordm/recordm/definitions/name/Dashboard_v1"
const AUTH_PATH = "/recordm/security/auth"

// ----------------------------------------------------------------- arguments and repo locations

const args = process.argv.slice(2)
const flags = {}
const positional = []
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--force" || args[i] === "--dry-run") flags[args[i].substring(2)] = true
    else if (args[i] === "--server" || args[i] === "--dir" || args[i] === "--env") flags[args[i].substring(2)] = args[++i]
    else positional.push(args[i])
}
const [command, target] = positional

function findRepoRoot() {
    let dir = resolve(".")
    while (true) {
        if (existsSync(join(dir, "environments")) || existsSync(join(dir, ".server"))) return dir
        const parent = dirname(dir)
        if (parent === dir) return resolve(".") // not inside a cob-cli repo: use cwd (needs --server)
        dir = parent
    }
}

const repoRoot = findRepoRoot()
const dashboardsRoot = flags.dir ? resolve(flags.dir) : join(repoRoot, "dashboards")

let resolvedServer = null
function serverUrl() {
    if (!resolvedServer) {
        resolvedServer = resolveServer()
        console.error("server: " + resolvedServer)
    }
    return resolvedServer
}

function resolveServer() {
    if (flags.server) return flags.server.replace(/\/$/, "")
    if (process.env.COB_SERVER) return process.env.COB_SERVER.replace(/\/$/, "")
    const environment = flags.env || "prod"
    const candidates = [
        join(repoRoot, "environments", environment, "server"), // cob-cli convention
        join(repoRoot, ".server"),                             // legacy repos
    ]
    for (const file of candidates) {
        if (existsSync(file)) {
            const name = readFileSync(file, 'utf8').trim()
            return "https://" + (name.includes(".") ? name : name + ".cultofbits.com")
        }
    }
    throw new Error("no server: use --server <url>, COB_SERVER, or run inside a cob-cli repo (environments/" + environment + "/server or .server)")
}

// ------------------------------------------------------------------------------- http and auth

let cookie = null

function prompt(question, hidden = false) {
    return new Promise((resolvePrompt) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
        if (hidden) {
            rl._writeToOutput = (text) => rl.output.write(text.includes(question) ? text : "*")
        }
        rl.question(question, (answer) => {
            rl.close()
            if (hidden) process.stdout.write("\n")
            resolvePrompt(answer.trim())
        })
    })
}

async function ensureAuth() {
    if (cookie != null) return
    serverUrl() // resolve (and show) the target server before asking for credentials
    if (process.env.COB_TOKEN) {
        cookie = "cobtoken=" + process.env.COB_TOKEN
        return
    }
    const username = process.env.COB_USERNAME || await prompt("username: ")
    const password = process.env.COB_PASSWORD || await prompt("password: ", true)
    const response = await fetch(serverUrl() + AUTH_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
    })
    if (!response.ok) throw new Error("authentication failed (" + response.status + ") on " + serverUrl())
    cookie = response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ")
}

async function api(method, path, body) {
    await ensureAuth()
    const response = await fetch(serverUrl() + path, {
        method,
        headers: { cookie, ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    })
    const text = await response.text()
    if (!response.ok) throw new Error(method + " " + path + " -> " + response.status + " " + text.slice(0, 300))
    return text ? JSON.parse(text) : null
}

const getInstance = (id) => api("GET", INSTANCES_PATH + id)
const getDefinition = () => api("GET", DEFINITION_PATH)

// ------------------------------------------------------------------------------------- helpers

function findLocal(idOrDirName) {
    const dirs = listDashboardDirs(dashboardsRoot)
    return dirs.find(d => d.instanceId === "" + idOrDirName || d.name === idOrDirName)
}

function gitUncommittedChanges(dir) {
    const result = spawnSync("git", ["status", "--porcelain", "--", dir], { cwd: repoRoot, encoding: "utf8" })
    if (result.status !== 0) {
        console.warn("warning: not a git repo (or git unavailable) - skipping local changes check")
        return ""
    }
    return result.stdout.trim()
}

// both sides of any comparison go through the same serialize+parse normalization, so key order,
// template residues and empty-vs-missing differences never show up as false diffs
const normalize = (canonical, definition) => parseDashboardFull(serializeDashboard(canonical, definition))

function writePulled(raw) {
    const canonical = parseDashboardFull(raw)
    const existing = findLocal(canonical.instanceId)
    let dashboardDir
    if (existing) {
        dashboardDir = existing.dir
    } else {
        let name = slugify(canonical.Name)
        if (listDashboardDirs(dashboardsRoot).some(d => d.name === name)) name += "-" + canonical.instanceId
        dashboardDir = join(dashboardsRoot, name)
    }
    writeDashboardDir(dashboardDir, explodeDashboard(canonical))
    return { canonical, dashboardDir }
}

// ------------------------------------------------------------------------------------ commands

async function pull() {
    if (!target) throw new Error("usage: dash-sync pull <instanceId>")
    const local = findLocal(target)
    if (local && !flags.force) {
        const changes = gitUncommittedChanges(local.dir)
        if (changes) throw new Error("'" + local.dir + "' has uncommitted changes (commit them or use --force):\n" + changes)
    }
    const raw = await getInstance(local ? local.instanceId : target)
    const { canonical, dashboardDir } = writePulled(raw)
    console.log("pulled '" + canonical.Name + "' v" + canonical.version + " -> " + dashboardDir)
}

async function push() {
    if (!target) throw new Error("usage: dash-sync push <dir|instanceId> [--dry-run]")
    const local = findLocal(target)
    if (!local) throw new Error("dashboard '" + target + "' not found in " + dashboardsRoot + " (dashboards are created in the app and brought in with pull)")
    const canonical = implodeDashboard(local.dir)
    const definition = await getDefinition()
    const serverRaw = await getInstance(canonical.instanceId)

    if ("" + serverRaw.version !== "" + canonical.version && !flags.force) {
        throw new Error("'" + local.name + "': server is at v" + serverRaw.version + " but local representation is v" + canonical.version +
            " - someone changed it in the app. Run 'dash-sync diff " + local.name + "' and 'dash-sync pull' first (or push --force to overwrite)")
    }

    const serialized = adoptFieldIds(serializeDashboard(canonical, definition), serverRaw)
    const body = { ...serverRaw, fields: serialized.fields }

    if (flags["dry-run"]) {
        const bodyFile = join(mkdtempSync(join(tmpdir(), "dash-push-")), "put-body.json")
        writeFileSync(bodyFile, JSON.stringify(body, null, 2))
        console.log("dry-run: PUT " + INSTANCES_PATH + canonical.instanceId + " body written to " + bodyFile)
        return
    }

    await api("PUT", INSTANCES_PATH + canonical.instanceId, body)

    // finish with an implicit pull: records the new version and the server's normalization
    const pulled = writePulled(await getInstance(canonical.instanceId))
    console.log("pushed '" + pulled.canonical.Name + "' v" + canonical.version + " -> v" + pulled.canonical.version)
    const contentOf = (c) => ({ ...normalize(c, definition), version: null }) // versions differ by design
    if (!isDeepStrictEqual(contentOf(canonical), contentOf(pulled.canonical))) {
        console.warn("warning: the server normalized some values on save - check 'git diff " + pulled.dashboardDir + "'")
    }
}

async function diffCommand() {
    if (!target) throw new Error("usage: dash-sync diff <dir|instanceId>")
    const local = findLocal(target)
    if (!local) throw new Error("dashboard '" + target + "' not found in " + dashboardsRoot)
    const definition = await getDefinition()
    const localNorm = normalize(implodeDashboard(local.dir), definition)
    const serverNorm = parseDashboardFull(await getInstance(local.instanceId))

    // diff the exploded forms: multiline fields diff line by line instead of as escaped JSON
    const base = mkdtempSync(join(tmpdir(), "dash-diff-"))
    writeDashboardDir(join(base, "server"), explodeDashboard(serverNorm))
    writeDashboardDir(join(base, "local"), explodeDashboard(localNorm))
    const result = spawnSync("git", ["diff", "--no-index", "--color", join(base, "server"), join(base, "local")], { stdio: "inherit" })
    if (result.status === 0) console.log("'" + local.name + "': no differences (local v" + localNorm.version + ", server v" + serverNorm.version + ")")
    process.exitCode = result.status === 1 ? 1 : (result.status || 0)
}

async function status() {
    const dirs = listDashboardDirs(dashboardsRoot)
    if (dirs.length === 0) {
        console.log("no dashboards in " + dashboardsRoot + " (use 'dash-sync pull <instanceId>' to bring one in)")
        return
    }
    const definition = await getDefinition()
    for (const entry of dirs) {
        try {
            if (entry.error) throw new Error(entry.error)
            const localNorm = normalize(implodeDashboard(entry.dir), definition)
            const serverNorm = parseDashboardFull(await getInstance(entry.instanceId))
            let state
            if ("" + serverNorm.version !== "" + localNorm.version) {
                state = "↓ pull needed (local v" + localNorm.version + ", server v" + serverNorm.version + ")"
            } else if (isDeepStrictEqual(localNorm, serverNorm)) {
                state = "✓ in sync (v" + localNorm.version + ")"
            } else {
                state = "↑ push needed (local changes over v" + localNorm.version + ")"
            }
            console.log(state.padEnd(0) + "  " + entry.name)
        } catch (e) {
            console.log("✗ error  " + entry.name + ": " + e.message)
            process.exitCode = 1
        }
    }
}

// --------------------------------------------------------------------------------------- main

const commands = { pull, push, diff: diffCommand, status }
if (!commands[command]) {
    console.error("usage: dash-sync <pull|push|diff|status> [args]  (see header of tools/dash-sync.js)")
    process.exit(1)
}
commands[command]().then(
    // explicit exit: fetch keep-alive sockets would otherwise hold the process for a few seconds
    () => process.exit(process.exitCode ?? 0),
    (e) => {
        console.error("dash-sync " + command + ": " + e.message + (e.cause ? " (" + e.cause.message + ")" : ""))
        process.exit(1)
    }
)
