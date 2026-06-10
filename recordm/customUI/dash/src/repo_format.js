// Repo directory format for a dashboard ("dashboards as code").
//
// A dashboard is stored as one directory (under recordm/customUI/dashs in client repos):
//   <name>/dashboard.json   - the canonical representation (parseDashboardFull output)
//   <name>/*.hbs            - multiline string fields, externalized for IDE editing
//
// Any string value containing a newline is moved to its own .hbs file and replaced in
// dashboard.json by a "@file:<filename>" reference (single-line values stay inline). The file
// content is the field value verbatim. implodeDashboard reverses this, so:
//   implodeDashboard(explodeDashboard(canonical)) ≡ canonical
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const FILE_REF_PREFIX = "@file:"

// Keys added by parseDashboard that are derived from other data and would only add noise to the
// stored representation (parseDashboard recreates them)
function stripDerived(canonical) {
    for (const board of (canonical.Board || [])) {
        delete board.Dash
    }
    return canonical
}

// Deterministic top-level key order, for readable and diff-stable dashboard.json files
function orderCanonical(canonical) {
    const first = ["instanceId", "version", "Name", "Description", "Order", "Solution"]
    const ordered = {}
    for (const key of first) {
        if (key in canonical) ordered[key] = canonical[key]
    }
    for (const key of Object.keys(canonical)) {
        if (!(key in ordered)) ordered[key] = canonical[key]
    }
    return ordered
}

const sanitize = (segment) => String(segment).replaceAll(/[^A-Za-z0-9-]+/g, "_")

// Returns { "dashboard.json": string, "<field path>.hbs": string, ... }
function explodeDashboard(canonical) {
    const files = {}

    const walk = (node, pathSegments) => {
        if (Array.isArray(node)) {
            // components get their type in the file name, for readability ("Component.0-Menu...")
            return node.map((element, i) => {
                const segment = (element && typeof element === 'object' && typeof element.Component === 'string')
                    ? i + "-" + element.Component
                    : i
                return walk(element, pathSegments.concat(segment))
            })
        }
        if (node && typeof node === 'object') {
            const result = {}
            for (const key of Object.keys(node)) {
                result[key] = walk(node[key], pathSegments.concat(key))
            }
            return result
        }
        if (typeof node === 'string' && (node.includes("\n") || node.startsWith(FILE_REF_PREFIX))) {
            const fileName = pathSegments.map(sanitize).join(".") + ".hbs"
            files[fileName] = node
            return FILE_REF_PREFIX + fileName
        }
        return node
    }

    const exploded = walk(orderCanonical(stripDerived(structuredClone(canonical))), [])
    files["dashboard.json"] = JSON.stringify(exploded, null, 2) + "\n"
    return files
}

// Reads a dashboard directory back into the canonical representation
function implodeDashboard(dashboardDir) {
    const dashboardJson = readFileSync(join(dashboardDir, "dashboard.json"), 'utf8')
    const resolveRefs = (node) => {
        if (Array.isArray(node)) return node.map(resolveRefs)
        if (node && typeof node === 'object') {
            for (const key of Object.keys(node)) node[key] = resolveRefs(node[key])
            return node
        }
        if (typeof node === 'string' && node.startsWith(FILE_REF_PREFIX)) {
            const fileName = node.substring(FILE_REF_PREFIX.length)
            try {
                return readFileSync(join(dashboardDir, fileName), 'utf8')
            } catch (e) {
                throw new Error("dashboard.json references missing file '" + fileName + "' in " + dashboardDir)
            }
        }
        return node
    }
    return resolveRefs(JSON.parse(dashboardJson))
}

// Writes the exploded files to a directory, removing stale .hbs files from previous versions
function writeDashboardDir(dashboardDir, files) {
    mkdirSync(dashboardDir, { recursive: true })
    for (const existing of readdirSync(dashboardDir)) {
        if (existing.endsWith(".hbs") && !(existing in files)) {
            rmSync(join(dashboardDir, existing))
        }
    }
    for (const [fileName, content] of Object.entries(files)) {
        writeFileSync(join(dashboardDir, fileName), content)
    }
}

// Lists the dashboard directories under a dashboards root, with their canonical identity
function listDashboardDirs(dashboardsRoot) {
    if (!existsSync(dashboardsRoot)) return []
    const result = []
    for (const entry of readdirSync(dashboardsRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const dir = join(dashboardsRoot, entry.name)
        if (!existsSync(join(dir, "dashboard.json"))) continue
        try {
            const canonical = JSON.parse(readFileSync(join(dir, "dashboard.json"), 'utf8'))
            result.push({ name: entry.name, dir, instanceId: "" + canonical.instanceId, version: "" + canonical.version })
        } catch (e) {
            result.push({ name: entry.name, dir, error: "invalid dashboard.json: " + e.message })
        }
    }
    return result
}

const slugify = (name) => String(name).normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^A-Za-z0-9._-]+/g, "-").replaceAll(/^-+|-+$/g, "") || "dashboard"

export { explodeDashboard, implodeDashboard, writeDashboardDir, listDashboardDirs, stripDerived, orderCanonical, slugify, FILE_REF_PREFIX }
