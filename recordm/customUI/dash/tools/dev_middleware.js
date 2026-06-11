// Dev-server middleware for "dashboards as code": when running `cob-cli test -d dash` (or
// `npm run serve`), dashboards represented in the client repo (recordm/customUI/dashs) are served
// LOCALLY instead of being fetched from the RecordM server, and any edit to them reloads the
// browser. This gives a hot-reload edit loop with zero writes (and zero version increments) on
// the RecordM instance — pushing with dash-sync stays a deliberate act.
//
// The interception happens at the only point App.vue reads the dashboard content
// (GET /recordm/recordm/instances/<id>): the local canonical representation is serialized back
// to a RecordM instance with the exact production pipeline (serializer.js), so what you see in
// dev is byte-for-byte what a dash-sync push would produce. Everything else (name->id search,
// menus, context queries) still proxies to the real server.
//
// CommonJS on purpose: it is require()d by vue.config.js; the ESM app modules are loaded with a
// dynamic import. Requires Node >= 22 (module syntax detection) and fetch (Node >= 18).
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')

const DEFINITION_PATH = "/recordm/recordm/definitions/name/Dashboard_v1"

module.exports = function installLocalDashboards(app, server, { dashboardsDir, serverUrl }) {
    if (!fs.existsSync(dashboardsDir)) return false

    let modulesPromise = null
    const loadModules = () => modulesPromise = modulesPromise || Promise.all([
        import(pathToFileURL(path.join(__dirname, "../src/serializer.js")).href),
        import(pathToFileURL(path.join(__dirname, "../src/repo_format.js")).href),
    ]).then(([serializer, repoFormat]) => ({ ...serializer, ...repoFormat }))

    // index: instanceId -> dashboard directory (rebuilt lazily after any file change)
    let index = null
    const buildIndex = (repoFormat) => {
        index = new Map()
        for (const entry of repoFormat.listDashboardDirs(dashboardsDir)) {
            if (entry.error) {
                // without a readable dashboard.json there is no instanceId to intercept: the
                // server version will be served - make that visible in the terminal
                console.log("[CoB] LOCAL dashboard '" + entry.name + "' ignored: " + entry.error)
            } else {
                index.set(entry.instanceId, entry)
            }
        }
        return index
    }

    // build the index eagerly at startup, so the terminal immediately shows what is registered
    // (and any module-loading problem), instead of failing silently on the first request
    loadModules()
        .then(modules => {
            const entries = [...buildIndex(modules).values()]
            console.log("[CoB] Local dashboards indexed: " + (entries.length === 0 ? "none found in " + dashboardsDir
                : entries.map(e => e.name + " (instance " + e.instanceId + ")").join(", ")))
        })
        .catch(e => console.log("[CoB] Local dashboards failed to load modules: " + e.message))

    // the Dashboard_v1 definition comes from the real server, reusing the browser's session
    // cookie (the same one the proxied app requests use); cached after the first fetch
    let definitionPromise = null
    const getDefinition = (cookie) => definitionPromise = definitionPromise ||
        fetch(serverUrl + DEFINITION_PATH, { headers: cookie ? { cookie } : {} })
            .then(response => {
                if (!response.ok) throw new Error("GET " + DEFINITION_PATH + " -> " + response.status)
                return response.json()
            })
            .catch(e => { definitionPromise = null; throw e })

    app.get('/recordm/recordm/instances/:id', (req, res, next) => {
        loadModules()
            .then(modules => {
                const entry = (index || buildIndex(modules)).get(req.params.id)
                if (!entry) {
                    console.log("[CoB] instance " + req.params.id + " not represented locally -> server")
                    return next()
                }
                return getDefinition(req.headers.cookie).then(definition => {
                    const canonical = modules.implodeDashboard(entry.dir)
                    console.log("[CoB] Serving LOCAL dashboard " + req.params.id + " ('" + canonical.Name + "') from " + entry.dir)
                    // the header tells App.vue to subscribe to the edit events below (hot reload)
                    res.set("X-Cob-Local-Dashboard", "true").json(modules.serializeDashboard(canonical, definition))
                })
            })
            .catch(e => {
                // fail loud: a silent fallback to the server version would hide local errors
                // (console.log, not console.error: cob-cli test discards the devserver's stderr)
                console.log("[CoB] LOCAL dashboard " + req.params.id + " error: " + e.message)
                res.status(500).json({ error: "local dashboard error: " + e.message })
            })
    })

    // hot reload: pages whose dash bundle saw the X-Cob-Local-Dashboard header subscribe here
    // (server-sent events) and rebuild the dashboard in place on each edit (see App.vue)
    const sseClients = new Set()
    app.get('/recordm/recordm/local-dashboards/events', (req, res) => {
        res.set({ "content-type": "text/event-stream", "cache-control": "no-cache", "connection": "keep-alive" })
        if (res.flushHeaders) res.flushHeaders()
        res.write("retry: 1000\n\n")
        sseClients.add(res)
        req.on("close", () => sseClients.delete(res))
    })

    // full browser reload, for pages without a hot-reload subscription (older dash bundle);
    // supports both webpack-dev-server v3 (the dash vue devserver) and v4 (cob-cli)
    const triggerBrowserReload = () => {
        if (server && typeof server.sockWrite === "function") {
            server.sockWrite(server.sockets, "content-changed") // webpack-dev-server v3
        } else if (server && typeof server.sendMessage === "function" && server.webSocketServer) {
            server.sendMessage(server.webSocketServer.clients, "static-changed") // webpack-dev-server v4
        }
    }

    let reloadTimer = null
    try {
        fs.watch(dashboardsDir, { recursive: true }, () => {
            index = null
            clearTimeout(reloadTimer)
            reloadTimer = setTimeout(() => {
                if (sseClients.size > 0) {
                    console.log("[CoB] " + dashboardsDir + " changed -> hot reloading dashboard")
                    for (const client of sseClients) client.write("data: changed\n\n")
                } else {
                    console.log("[CoB] " + dashboardsDir + " changed -> reloading browser")
                    triggerBrowserReload()
                }
            }, 200)
        })
    } catch (e) {
        console.log("[CoB] dashboards watch unavailable (" + e.message + ") - edit reloads disabled")
    }

    return true
}
