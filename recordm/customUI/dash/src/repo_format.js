// Repo directory format for a dashboard ("dashboards as code").
//
// A dashboard is stored as one directory (under recordm/customUI/dashs in client repos):
//   <name>/dashboard.yaml   - the canonical representation (parseDashboardFull output)
//   <name>/*.hbs            - multiline string fields, externalized for IDE editing
//
// Any string value containing a newline is moved to its own .hbs file and replaced in
// dashboard.yaml by a "@file:<filename>" reference (single-line values stay inline). The file
// content is the field value verbatim. implodeDashboard reverses this, so:
//   implodeDashboard(explodeDashboard(canonical)) ≡ canonical
//
// YAML manual-edit safety: every value in the canonical is a string. The dump quotes anything
// ambiguous; on read, scalars edited without quotes that YAML parses as number/boolean are
// coerced back to strings, and null values (e.g. an unquoted value starting with '#', which
// YAML treats as a comment) fail with a clear error.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import YAML from 'yaml'

const FILE_REF_PREFIX = "@file:"

// Keys added by parseDashboard that are derived from other data and would only add noise to the
// stored representation (parseDashboard recreates them)
function stripDerived(canonical) {
    for (const board of (canonical.Board || [])) {
        delete board.Dash
    }
    return canonical
}

// Deterministic top-level key order, for readable and diff-stable dashboard.yaml files
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

// segment used for an array element in .hbs file names and validation paths (1-based, the first
// Board is 1; components carry their type for readability: "2-Menu")
const elementSegment = (element, i) =>
    (element && typeof element === 'object' && typeof element.Component === 'string')
        ? (i + 1) + "-" + element.Component
        : "" + (i + 1)

// name of the .hbs file for a field at the given path (shared with the validator)
const fieldFileName = (pathSegments) => pathSegments.map(sanitize).join(".") + ".hbs"

// collect() appends each occurrence's own value (the key with the array's name) AFTER the
// children, which buries the identifying line at the bottom of the block. For readability the
// own key (and the components' id) comes first: "- Board: Hierarchy", "- Component: Menu", ...
function orderElementKeys(element, ownKey) {
    if (!element || typeof element !== 'object' || Array.isArray(element)) return element
    const ordered = {}
    for (const key of [ownKey, "id"]) {
        if (key in element) ordered[key] = element[key]
    }
    for (const key of Object.keys(element)) {
        if (!(key in ordered)) ordered[key] = element[key]
    }
    return ordered
}

// Returns { "dashboard.yaml": string, "<field path>.hbs": string, ... }
function explodeDashboard(canonical) {
    const files = {}

    const walk = (node, pathSegments) => {
        if (Array.isArray(node)) {
            const ownKey = pathSegments[pathSegments.length - 1]
            return node.map((element, i) =>
                walk(orderElementKeys(element, ownKey), pathSegments.concat(elementSegment(element, i))))
        }
        if (node && typeof node === 'object') {
            const result = {}
            for (const key of Object.keys(node)) {
                result[key] = walk(node[key], pathSegments.concat(key))
            }
            return result
        }
        if (typeof node === 'string' && (node.includes("\n") || node.startsWith(FILE_REF_PREFIX))) {
            const fileName = fieldFileName(pathSegments)
            files[fileName] = node
            return FILE_REF_PREFIX + fileName
        }
        return node
    }

    const exploded = walk(orderCanonical(stripDerived(structuredClone(canonical))), [])
    files["dashboard.yaml"] = YAML.stringify(exploded, { indent: 2, lineWidth: 0 })
    return files
}

// Reads a dashboard directory back into the canonical representation
function implodeDashboard(dashboardDir) {
    const dashboardYaml = readFileSync(join(dashboardDir, "dashboard.yaml"), 'utf8')
    const resolveRefs = (node, path) => {
        if (Array.isArray(node)) return node.map((element, i) => resolveRefs(element, path + "[" + (i + 1) + "]")) // 1-based, like the .hbs names
        if (node && typeof node === 'object') {
            for (const key of Object.keys(node)) node[key] = resolveRefs(node[key], path ? path + "." + key : key)
            return node
        }
        if (node === null || node === undefined) {
            throw new Error("null value at '" + path + "' in dashboard.yaml - missing quotes? (values starting with #, {{, * or & must be quoted; an empty value is written as \"\")")
        }
        if (typeof node === 'number' || typeof node === 'boolean') {
            // RecordM values are always strings: recover unquoted manual edits. The one legit
            // numeric scalar is the components' field 'id' (assigned by parseDashboard)
            return (path === "id" || path.endsWith(".id")) ? node : String(node)
        }
        if (typeof node === 'string' && node.startsWith(FILE_REF_PREFIX)) {
            const fileName = node.substring(FILE_REF_PREFIX.length)
            try {
                return readFileSync(join(dashboardDir, fileName), 'utf8')
            } catch (e) {
                throw new Error("dashboard.yaml references missing file '" + fileName + "' in " + dashboardDir)
            }
        }
        return node
    }
    return resolveRefs(YAML.parse(dashboardYaml), "")
}

// Writes the exploded files to a directory, removing stale .hbs files from previous versions
function writeDashboardDir(dashboardDir, files) {
    mkdirSync(dashboardDir, { recursive: true })
    for (const existing of readdirSync(dashboardDir)) {
        // dashboard.json is cleaned up too: leftover from the pre-yaml format
        if ((existing.endsWith(".hbs") || existing === "dashboard.json") && !(existing in files)) {
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
        if (!existsSync(join(dir, "dashboard.yaml"))) continue
        try {
            const canonical = YAML.parse(readFileSync(join(dir, "dashboard.yaml"), 'utf8'))
            result.push({ name: entry.name, dir, instanceId: "" + canonical.instanceId, version: "" + canonical.version })
        } catch (e) {
            result.push({ name: entry.name, dir, error: "invalid dashboard.yaml: " + e.message })
        }
    }
    return result
}

const slugify = (name) => String(name).normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^A-Za-z0-9._-]+/g, "-").replaceAll(/^-+|-+$/g, "") || "dashboard"

export { explodeDashboard, implodeDashboard, writeDashboardDir, listDashboardDirs, stripDerived, orderCanonical, slugify, elementSegment, fieldFileName, FILE_REF_PREFIX }
