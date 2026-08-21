import { clone, collect, parseDashboard } from './collector.js'

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

function serializeDashboard(dash, definition) {
    const defFields = Array.isArray(definition) ? definition : (definition && definition.fieldDefinitions)
    if (!defFields) throw new Error("serializeDashboard: invalid definition (expected {fieldDefinitions: [...]} or an array of field definitions)")

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

// Grafts the field ids of an existing server instance onto a serialized instance, pairing
// occurrences of the same field (by fieldDefinition name) in order. This makes the PUT body look
// like a regular instance-editor save: existing fields keep their ids, new occurrences keep the
// negative placeholder ids assigned by serializeDashboard.
function adoptFieldIds(target, source) {
    const sourceByName = new Map()
    for (const field of (source.fields || [])) {
        const name = field.fieldDefinition.name
        if (!sourceByName.has(name)) sourceByName.set(name, [])
        sourceByName.get(name).push(field)
    }
    const used = new Map()
    for (const field of (target.fields || [])) {
        const name = field.fieldDefinition.name
        const occurrences = sourceByName.get(name) || []
        const index = used.get(name) || 0
        if (index < occurrences.length) {
            used.set(name, index + 1)
            if (field.id == null || field.id < 0) field.id = occurrences[index].id
            adoptFieldIds(field, occurrences[index])
        }
    }
    return target
}

export { serializeDashboard, parseDashboardFull, parseDashboardExtras, adoptFieldIds, DashExtrasTemplate }
