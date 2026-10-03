import { clone, collect, parseDashboard, DashTemplate, ComponentsTemplates } from './collector.js'

// serializeDashboard is the inverse of parseDashboard (collector.js): it takes the parsed
// (canonical) dashboard representation and the Dashboard_v1 definition and produces a RecordM
// instance shaped { id, version, fields: [...] }, where each field is
// { id, fieldDefinition, value, fields: [...] }.
//
// This is the basis for keeping dashboards represented in a git repo ("dashboards as code"):
// the repo stores the canonical representation, and this module rebuilds the instance to be
// pushed to RecordM. The guaranteed property (see test_serializer.js) is that serialization is
// a fixed point of the parse/serialize cycle:
//      parseDashboard(serializeDashboard(parseDashboard(raw))) ≡ parseDashboard(raw)
//
// Notes on normalization (intentional, matches what RecordM/parseDashboard do):
//  - empty strings are stored as null (RecordM never stores ""), so template residues like
//    {TextClasses: ""} converge to {} after one cycle;
//  - $file values expressed as the URL built by collect() are inverted back to the stored
//    file name (the URL is rebuilt by parseDashboard from instanceId + fieldDefinition id);
//  - fields not captured by the canonical representation are emitted as empty occurrences,
//    mirroring the placeholder fields RecordM returns for unfilled definition fields.

const FILE_URL_PATTERN = /^\/recordm\/recordm\/instances\/[^/]+\/files\/[^/]+\/(.+)$/

// The real /definitions/name/<name> endpoint returns fieldDefinitions as a pre-order FLAT list
// of every field in the tree, each entry still carrying its `fields` subtree (the repo copy and
// saved definitions can be proper trees). Serializing from the flat shape emitted a rogue root
// occurrence for every nested field - a real PUT bounced with 400 NOT_DUPLICABLE_FIELD. Rebuild
// the tree by dropping the entries that another entry already contains; a proper tree (or an
// id-less definition) passes through unchanged.
function treeifyFieldDefinitions(defFields) {
    const nested = new Set()
    const mark = (fields) => fields.forEach(f => { if (f.id != null) nested.add(f.id); mark(f.fields || []) })
    for (const def of defFields) mark(def.fields || [])
    return defFields.filter(f => f.id == null || !nested.has(f.id))
}

function serializeDashboard(dash, definition) {
    const rawDefFields = Array.isArray(definition) ? definition : (definition && definition.fieldDefinitions)
    if (!rawDefFields) throw new Error("serializeDashboard: invalid definition (expected {fieldDefinitions: [...]} or an array of field definitions)")
    const defFields = treeifyFieldDefinitions(rawDefFields)

    const state = { nextPlaceholderId: -1 }
    const id = Number(dash.instanceId)
    const version = Number(dash.version)
    return {
        id: isNaN(id) ? dash.instanceId : id,
        version: isNaN(version) ? dash.version : version,
        fields: serializeFields(defFields, dash, state),
    }
}

function serializeFields(defFields, node, state) {
    const fields = []
    for (const def of defFields) {
        const value = node ? node[def.name] : undefined
        if (def.name === "Component" && Array.isArray(value)) {
            // Components are typed: parseDashboard turns each Component field into an object with
            // the type under 'Component' and the original field id under 'id' (see the board loop
            // in collector.js). The children are the keys of the type's ComponentsTemplates entry.
            for (const component of value) {
                fields.push(makeField(def, component["Component"], component, state, component.id))
            }
            if (value.length === 0) {
                fields.push(makeField(def, null, null, state))
            }
        } else if (Array.isArray(value)) {
            // Duplicable (or collected-as-array) field: one occurrence per element. Each element
            // carries the occurrence's own value under the field's name (set by collect) and the
            // children values under their names.
            for (const element of value) {
                fields.push(makeField(def, element ? element[def.name] : null, element, state))
            }
            if (value.length === 0) {
                fields.push(makeField(def, null, null, state))
            }
        } else if (value !== undefined && value !== null && typeof value !== 'object') {
            fields.push(makeField(def, value, node, state))
        } else {
            // Field not captured in the canonical representation: emit an empty occurrence (like
            // the placeholders RecordM returns for unfilled fields). Children are still matched
            // against the same node, mirroring how collect() searches for bucket keys at any
            // depth of the instance tree.
            fields.push(makeField(def, null, node, state))
        }
    }
    return fields
}

function makeField(def, value, childrenNode, state, knownId) {
    return {
        id: (knownId !== undefined && knownId !== null) ? knownId : state.nextPlaceholderId--,
        // only what parseDashboard/adoptFieldIds read: embedding the full definition node would
        // repeat its `fields` subtree and `descendents` list at every level, inflating a PUT
        // body to several MB (a real push bounced off nginx's request size limit with 413)
        fieldDefinition: { id: def.id, name: def.name, description: def.description },
        value: normalizeValue(def, value),
        fields: (def.fields && def.fields.length) ? serializeFields(def.fields, childrenNode, state) : [],
    }
}

function normalizeValue(def, value) {
    if (value === undefined || value === null || value === "") return null // RecordM stores empty as null
    if (typeof value === 'string' && def.description && def.description.indexOf("$file") >= 0) {
        const match = value.match(FILE_URL_PATTERN)
        if (match) return match[1] // invert the $file URL built by collect() back to the stored file name
    }
    return value
}

// Root instance fields that the dash app uses (via the ES search results: solution_menu, order,
// description, ...) but that parseDashboard's template does not capture. A repo representation
// must include them, otherwise pushing a dashboard would clear its solution/menu/order.
const DashExtrasTemplate = {
    "Solution": "",
    "Description": "",
    "Order": "",
}

// Companion of parseDashboard for the repo representation: collects the extra root fields from
// the raw instance, with the same normalization rules (nulls and processing keys removed).
// Usage: { ...parseDashboard(raw), ...parseDashboardExtras(raw) }
function parseDashboardExtras(raw_dashboard) {
    let extras = clone(DashExtrasTemplate)
    extras.instanceId = "" + raw_dashboard.id //needed to build $file url
    raw_dashboard.fields.reduce(collect, extras)
    extras = JSON.parse(JSON.stringify(extras, (k, v) => (k === 'instanceId') ? undefined : v))
    extras = JSON.parse(JSON.stringify(extras, (k, v) => (v === null) ? undefined : v))
    return extras
}

// The full canonical representation used by the repo tooling: everything parseDashboard captures
// plus the extra root fields. This is what gets stored in a repo and fed to serializeDashboard.
function parseDashboardFull(raw_dashboard) {
    return { ...parseDashboard(raw_dashboard), ...parseDashboardExtras(raw_dashboard) }
}

// Field names the canonical representation manages (every template key, recursively): for these
// the repo's value is authoritative, including null (= clear the field). Every OTHER field of
// the definition is server-owned - e.g. the "$auto.ref(Solution).field(...)" fields - and a
// push must return the server's current value untouched, like the app editor does: pushing null
// there made RecordM re-materialize the value into a second occurrence, and the PUT bounced
// with 400 NOT_DUPLICABLE_FIELD.
const collectTemplateNames = (template, names) => {
    for (const [key, value] of Object.entries(template)) {
        names.add(key)
        if (Array.isArray(value)) collectTemplateNames(value[0] || {}, names)
    }
    return names
}
const MANAGED_NAMES = collectTemplateNames({ ...DashTemplate, ...DashExtrasTemplate }, new Set())
for (const template of Object.values(ComponentsTemplates)) collectTemplateNames(template, MANAGED_NAMES)

// Every field id the representation pins explicitly (the components' `id`, kept by the repo so
// an edited component updates the server occurrence instead of replacing it). These identify an
// existing occurrence and may NEVER be handed to a different one: the same id twice in a PUT
// body is rejected by RecordM with an opaque 500 DATA_ACCESS_ERROR.
function collectIds(fields, acc = new Set()) {
    for (const field of (fields || [])) {
        if (field.id > 0) acc.add(field.id)
        collectIds(field.fields, acc)
    }
    return acc
}

function groupByName(fields) {
    const byName = new Map()
    for (const field of (fields || [])) {
        const name = field.fieldDefinition.name
        if (!byName.has(name)) byName.set(name, [])
        byName.get(name).push(field)
    }
    return byName
}

// Pairs the occurrences of one field name, target index -> source index. Positional pairing
// alone breaks as soon as the repo INSERTS an occurrence (a new board, a new component): every
// occurrence after it shifts by one and ends up grafted onto the wrong server occurrence - and
// the ids the repo pins further down are then emitted twice. So anchor first, position after.
function pairOccurrences(targets, sources, pinned, name) {
    const sourceIds = sources.map(source => collectIds([source]))
    const pairs = new Map()
    const claimed = new Set()

    // 1. anchored: occurrences that share a pinned id. For a component that is its own `id`;
    // for a board (which carries no id of its own) it is the ids of the components below it.
    const candidates = []
    targets.forEach((target, ti) => {
        const ids = [...collectIds([target])]
        sources.forEach((source, si) => {
            const score = ids.filter(id => sourceIds[si].has(id)).length
            if (score > 0) candidates.push({ ti, si, score })
        })
    })
    candidates.sort((a, b) => b.score - a.score)
    for (const { ti, si } of candidates) {
        if (pairs.has(ti) || claimed.has(si)) continue
        pairs.set(ti, si)
        claimed.add(si)
    }

    // 2. positional, for what is left (occurrences with no id anywhere, and genuinely new ones).
    // A source whose subtree holds an id pinned ELSEWHERE in the target is off the table: it
    // belongs to another occurrence, and lending its ids here is the duplicate-id bug above.
    const available = sources
        .map((source, si) => si)
        .filter(si => !claimed.has(si) && ![...sourceIds[si]].some(id => pinned.has(id)))
    targets.forEach((target, ti) => {
        if (pairs.has(ti)) return
        const si = available.find(si => !claimed.has(si)
            // components are typed: another type holds different children, so taking over its
            // occurrence would rewrite the wrong component
            && (name !== "Component" || sources[si].value === target.value))
        if (si === undefined) return
        pairs.set(ti, si)
        claimed.add(si)
    })
    return pairs
}

// Grafts an existing server instance onto a serialized instance, pairing occurrences of the
// same field (by fieldDefinition name, see pairOccurrences), so the PUT body looks like a
// regular instance-editor save: existing fields keep their server ids (new occurrences keep the
// negative placeholder ids assigned by serializeDashboard), and fields OUTSIDE the canonical
// representation keep the server's value (see MANAGED_NAMES above).
function adoptFieldIds(target, source, pinned) {
    if (pinned === undefined) pinned = collectIds(target.fields)
    const sourceByName = groupByName(source.fields)
    for (const [name, targets] of groupByName(target.fields)) {
        const sources = sourceByName.get(name) || []
        for (const [ti, si] of pairOccurrences(targets, sources, pinned, name)) {
            const field = targets[ti]
            if (field.id == null || field.id < 0) field.id = sources[si].id
            if (!MANAGED_NAMES.has(name)) field.value = sources[si].value
            adoptFieldIds(field, sources[si], pinned)
        }
    }
    return target
}

// Fields emitted more than once with the same id: RecordM answers such a PUT with a bare 500
// DATA_ACCESS_ERROR, so push checks the body itself and says which occurrences collide.
function duplicateFieldIds(instance) {
    const seen = new Map()
    const duplicates = []
    const walk = (fields, path) => (fields || []).forEach((field, i) => {
        const where = path + "/" + field.fieldDefinition.name + "[" + (i + 1) + "]"
        if (field.id > 0) {
            if (seen.has(field.id)) duplicates.push({ id: field.id, first: seen.get(field.id), second: where })
            else seen.set(field.id, where)
        }
        walk(field.fields, where)
    })
    walk(instance.fields, "")
    return duplicates
}


export { serializeDashboard, parseDashboardFull, parseDashboardExtras, adoptFieldIds, duplicateFieldIds, DashExtrasTemplate }
