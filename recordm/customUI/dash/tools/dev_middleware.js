// Dev-server middleware for "dashboards as code": when running `cob-cli test -d dash` (or
// `npm run serve`), dashboards represented in the client repo's dashboards/ directory are served
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
                console.error("[CoB] LOCAL dashboard '" + entry.name + "' ignored: " + entry.error)
            } else {
                index.set(entry.instanceId, entry)
            }
        }
        return index
    }

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
                if (!entry) return next()
                return getDefinition(req.headers.cookie).then(definition => {
                    const canonical = modules.implodeDashboard(entry.dir)
                    console.log("[CoB] Serving LOCAL dashboard " + req.params.id + " ('" + canonical.Name + "') from " + entry.dir)
                    res.json(modules.serializeDashboard(canonical, definition))
                })
            })
            .catch(e => {
                // fail loud: a silent fallback to the server version would hide local errors
                console.error("[CoB] LOCAL dashboard " + req.params.id + " error: " + e.message)
                res.status(500).json({ error: "local dashboard error: " + e.message })
            })
    })

    // any change under dashboards/ reloads the browser (App.vue then refetches the dashboard)
    let reloadTimer = null
    try {
        fs.watch(dashboardsDir, { recursive: true }, () => {
            index = null
            clearTimeout(reloadTimer)
            reloadTimer = setTimeout(() => {
                console.log("[CoB] dashboards/ changed -> reloading browser")
                if (server && typeof server.sockWrite === "function") {
                    server.sockWrite(server.sockets, "content-changed")
                }
            }, 200)
        })
    } catch (e) {
        console.warn("[CoB] dashboards/ watch unavailable (" + e.message + ") - edit reloads disabled")
    }

    return true
}
