// Tests for repo_format.js (the dashboards-as-code directory format).
// Run with: node src/test_repo_format.js   (Node >= 22)
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { serializeDashboard, parseDashboardFull, DashExtrasTemplate } from './serializer.js'
import { DashTemplate, ComponentsTemplates } from './collector.js'
import { explodeDashboard, implodeDashboard, writeDashboardDir, listDashboardDirs, stripDerived, slugify, isSingletonGroup } from './repo_format.js'
import { c0, cLinkOnly, loadNumberedDefinition, findDef } from './test_fixture.js'

const definition = loadNumberedDefinition()

// a realistic canonical: the fixture after a server round-trip (with residues, Dash, ids, ...)
const c1 = parseDashboardFull(serializeDashboard(c0, definition))

// ---------------------------------------------------------------------------------------------
// explode: multiline strings (and only those) become .hbs files referenced from dashboard.json
// ---------------------------------------------------------------------------------------------
const files = explodeDashboard(c1)
const hbsFiles = Object.keys(files).filter(f => f.endsWith(".hbs"))
assert.ok(hbsFiles.length >= 1)
assert.ok("dashboard.yaml" in files)

// the multiline MDContent of the Markdown component went to a file with a readable name
const mdFile = hbsFiles.find(f => f.includes("Markdown") && f.includes("MDContent"))
assert.ok(mdFile, "expected a .hbs file for the Markdown MDContent, got: " + hbsFiles.join(", "))
assert.equal(files[mdFile], "## Relatório\ncom **markdown** e\nvárias linhas")
assert.ok(files["dashboard.yaml"].includes("@file:" + mdFile))

// single-line values stay inline (Context in the fixture is single-line)
assert.ok(files["dashboard.yaml"].includes("Width: w-full"))

// derived keys are stripped from the stored representation
assert.ok(!files["dashboard.yaml"].includes("Dash:"))

// each array element opens with its identifying key (the "- " prefix proves first position):
// boards by name, components by type + id, duplicables with an own value (Text, Line, ...) by it
assert.ok(files["dashboard.yaml"].includes("- Board: Title"))
assert.ok(files["dashboard.yaml"].includes("- Component: Label\n        id: 9001"))
assert.ok(files["dashboard.yaml"].includes("- Text: Home"))

// ---------------------------------------------------------------------------------------------
// singleton groups (*Customize, LineBehaviour: non-duplicable in the definition) are flattened:
// the multi-select own value on the group key's line, the sub-fields hoisted to the parent level
// ---------------------------------------------------------------------------------------------
assert.ok(!files["dashboard.yaml"].includes("- MenuCustomize"), "singleton groups must not be lists")
assert.ok(!files["dashboard.yaml"].includes("- TextCustomize"))
assert.ok(files["dashboard.yaml"].includes("MenuCustomize: Classes\n"))
assert.ok(files["dashboard.yaml"].includes("MenuClasses: flex flex-col gap-y-2"))

// predictable order inside each element: own key, id, then the *Customize block, then the rest
assert.ok(files["dashboard.yaml"].includes("- Component: Menu\n        id: 9004\n        MenuCustomize: Classes"))
assert.ok(files["dashboard.yaml"].includes('- Text: Home\n            TextCustomize:'), "TextCustomize must come right after the Text own value")
assert.ok(files["dashboard.yaml"].includes('TextCustomize: "Classes\\0Icon"'), files["dashboard.yaml"].split("\n").find(l => l.includes("TextCustomize")))
// hoisted to the root: DashboardCustomize's sub-fields
assert.ok(files["dashboard.yaml"].includes("\nDashboardClasses: h-full"))
// an empty occurrence (the Markdown component never filled its group) stays visible as {}
assert.ok(files["dashboard.yaml"].includes("MarkdownCustomize: {}"))

// isSingletonGroup mirrors the definition: of the template array keys, exactly the
// non-duplicable ones are flattened
const templateArrayKeys = new Set()
const collectArrayKeys = (template) => {
    for (const [key, value] of Object.entries(template)) {
        if (Array.isArray(value)) {
            templateArrayKeys.add(key)
            collectArrayKeys(value[0] || {})
        }
    }
}
collectArrayKeys(DashTemplate)
Object.values(ComponentsTemplates).forEach(collectArrayKeys)
assert.ok(templateArrayKeys.size > 10)
const checkDuplicable = (defs) => defs.forEach(def => {
    if (templateArrayKeys.has(def.name)) {
        assert.equal(isSingletonGroup(def.name), def.duplicable === false,
            "isSingletonGroup('" + def.name + "') must match duplicable=" + def.duplicable + " in the definition")
    }
    checkDuplicable(def.fields || [])
})
checkDuplicable(definition.fieldDefinitions)

// ---------------------------------------------------------------------------------------------
// drift guard: the templates must cover the definition. A field added to Dashboard_v1 and not
// added to DashTemplate/ComponentsTemplates is invisible to the whole dashboards-as-code chain
// (parseDashboard never collects it, so a pull silently omits it and the repo stops being a
// faithful representation of the dashboard) — this is what happened to 'Link' in 6.102.0.
// When the definition evolves, add the field to the templates or, if the tooling deliberately
// does not manage it, list it here with the reason.
// ---------------------------------------------------------------------------------------------
const UNMANAGED_DEFINITION_FIELDS = new Map([
    ["Dashboard Info", "$group: layout only, holds no value"],
    ["Boards", "$group: layout only, holds no value"],
    ["URL", "$link $auto: computed by RecordM from the instance id"],
    ["Solution Sigla", "$auto.ref(Solution): computed by RecordM"],
    ["Solution Menu", "$auto.ref(Solution): computed by RecordM"],
    ["Solution Descrição", "$auto.ref(Solution): computed by RecordM"],
    ["Solution Icon", "$auto.ref(Solution): computed by RecordM"],
    ["Solution Ordem", "$auto.ref(Solution): computed by RecordM"],
    // the 'Viewer' component option has no component in the app (Board.vue only renders
    // ImageViewer/InstanceViewer, which superseded it in 6.74.0): its fields are dead weight
    ["Query", "fields of the dead 'Viewer' component type"],
    ["File", "fields of the dead 'Viewer' component type"],
    ["ViewerCustomize", "fields of the dead 'Viewer' component type"],
    ["ViewerClasses", "fields of the dead 'Viewer' component type"],
    ["OutputVarViewer", "fields of the dead 'Viewer' component type"],
])
// the check follows the same path as collect() does over the instance: a definition field is
// covered when its name is a key of the template in scope, and its children are then checked
// against that key's sub-template (against the SAME scope when the field is not a template key,
// mirroring collect(), which keeps looking for the bucket's keys deeper in the tree)
const componentsScope = Object.assign({}, ...Object.values(ComponentsTemplates))
const subTemplate = (template, name) => {
    if (name === "Component") return componentsScope // typed components: any type's fields may appear here
    const value = template[name]
    return (Array.isArray(value) && value[0]) ? value[0] : {}
}
const checkCovered = (defs, template, path) => defs.forEach(def => {
    const covered = def.name in template
    assert.ok(covered || UNMANAGED_DEFINITION_FIELDS.has(def.name),
        "field '" + path + "/" + def.name + "' exists in the Dashboard_v1 definition but not in the template of '" +
        (path || "/") + "': add it to DashTemplate/ComponentsTemplates (collector.js) or to UNMANAGED_DEFINITION_FIELDS")
    checkCovered(def.fields || [], covered ? subTemplate(template, def.name) : template, path + "/" + def.name)
})
checkCovered(definition.fieldDefinitions, { ...DashTemplate, ...DashExtrasTemplate }, "")

// the component types the tooling knows must be options of the definition's Component field
// (a typo there would make every component of that type unknown to the validator)
const componentOptions = new Set(
    findDef(definition.fieldDefinitions, ["Board", "Component"]).description.match(/\$\[([^\]]*)\]/)[1]
        .split(",").map(option => option.replace(/^\*/, "")))
for (const type of Object.keys(ComponentsTemplates)) {
    assert.ok(componentOptions.has(type), "component type '" + type + "' is not an option of 'Component' in the definition")
}
assert.deepEqual([...componentOptions].filter(option => !(option in ComponentsTemplates)), ["Viewer"],
    "a component type of the definition has no template: add it to ComponentsTemplates (collector.js)")

// the flattening is unambiguous: at every level, the level's keys and the sub-fields of its
// singleton groups never collide (otherwise implode couldn't know where a hoisted key belongs)
const checkNoCollisions = (template, where) => {
    const names = Object.entries(template).flatMap(([key, value]) =>
        (Array.isArray(value) && isSingletonGroup(key)) ? [key, ...Object.keys(value[0] || {})] : [key])
    assert.equal(new Set(names).size, names.length, "flattening collision at " + where + ": " + names.join(","))
    for (const [key, value] of Object.entries(template)) {
        if (Array.isArray(value)) checkNoCollisions(value[0] || {}, where + "." + key)
    }
}
checkNoCollisions({ ...DashTemplate, ...DashExtrasTemplate }, "root")
Object.entries(ComponentsTemplates).forEach(([type, template]) => checkNoCollisions(template, "root.Board.Component(" + type + ")"))

// ---------------------------------------------------------------------------------------------
// write + implode: the directory reads back to the canonical (minus derived keys)
// ---------------------------------------------------------------------------------------------
const dashboardsRoot = mkdtempSync(join(tmpdir(), "dash-repo-"))
const dashDir = join(dashboardsRoot, slugify(c1.Name))
writeDashboardDir(dashDir, files)

const imploded = implodeDashboard(dashDir)
assert.deepEqual(imploded, stripDerived(structuredClone(c1)))

// determinism: exploding the imploded canonical produces exactly the same files
assert.deepEqual(explodeDashboard(imploded), files)

// listDashboardDirs identifies the dashboard by instanceId/version
const listed = listDashboardDirs(dashboardsRoot)
assert.equal(listed.length, 1)
assert.equal(listed[0].instanceId, "458930")
assert.equal(listed[0].version, "7")

// ---------------------------------------------------------------------------------------------
// stale .hbs files from previous versions are removed on write
// ---------------------------------------------------------------------------------------------
writeFileSync(join(dashDir, "stale-leftover.hbs"), "old content")
writeDashboardDir(dashDir, explodeDashboard(imploded))
assert.ok(!existsSync(join(dashDir, "stale-leftover.hbs")))
assert.deepEqual(implodeDashboard(dashDir), imploded)

// ---------------------------------------------------------------------------------------------
// values that literally start with "@file:" are externalized too (no ambiguity on implode)
// ---------------------------------------------------------------------------------------------
const tricky = structuredClone(imploded)
tricky.Description = "@file:not-a-real-ref.hbs"
const trickyFiles = explodeDashboard(tricky)
assert.ok(Object.values(trickyFiles).includes("@file:not-a-real-ref.hbs"))
const trickyDir = join(dashboardsRoot, "tricky")
writeDashboardDir(trickyDir, trickyFiles)
assert.equal(implodeDashboard(trickyDir).Description, "@file:not-a-real-ref.hbs")

// ---------------------------------------------------------------------------------------------
// manual-edit safety: values edited without the quotes the dump emits still come back as the
// strings RecordM expects, and an unquoted '#' (yaml comment -> null) is a clear error
// ---------------------------------------------------------------------------------------------
const editedDir = join(dashboardsRoot, "edited")
const editedFiles = explodeDashboard(imploded)
assert.ok(editedFiles["dashboard.yaml"].includes('Order: "30"'), editedFiles["dashboard.yaml"].slice(0, 400))
editedFiles["dashboard.yaml"] = editedFiles["dashboard.yaml"]
    .replace('Order: "30"', "Order: 30")
    .replace('UpdateOnDrop: "0.5"', "UpdateOnDrop: 0.5")
    .replace('AllDay: "True"', "AllDay: True")
writeDashboardDir(editedDir, editedFiles)
const edited = implodeDashboard(editedDir)
assert.equal(edited.Order, "30")
assert.equal(edited.DashboardCustomize[0].UpdateOnDrop, "0.5")
assert.equal(edited.Board[1].Component[1].Events[1].AllDay, "true") // note: only quotes keep the original case

editedFiles["dashboard.yaml"] = editedFiles["dashboard.yaml"]
    .replace("Description: Dashboard de teste do round-trip", "Description: #comentario")
writeDashboardDir(editedDir, editedFiles)
assert.throws(() => implodeDashboard(editedDir), /null value at 'Description'/)

// ---------------------------------------------------------------------------------------------
// a group with sub-fields but no own value omits the group line entirely (and reads back)
// ---------------------------------------------------------------------------------------------
const noOwn = structuredClone(imploded)
noOwn.Board[0].Component[0].LabelCustomize = [{ LabelClasses: "x" }]
const noOwnFiles = explodeDashboard(noOwn)
assert.ok(!noOwnFiles["dashboard.yaml"].includes("LabelCustomize"))
assert.ok(noOwnFiles["dashboard.yaml"].includes("LabelClasses: x"))
const noOwnDir = join(dashboardsRoot, "no-own")
writeDashboardDir(noOwnDir, noOwnFiles)
assert.deepEqual(implodeDashboard(noOwnDir), noOwn)

// ---------------------------------------------------------------------------------------------
// backward compatibility: the previous format (singleton groups as 1-element lists) still reads
// to the same canonical, and re-exploding writes the flat form
// ---------------------------------------------------------------------------------------------
const oldFormDir = join(dashboardsRoot, "old-format")
writeDashboardDir(oldFormDir, {
    "dashboard.yaml": [
        'instanceId: "1"',
        'version: "1"',
        'Name: Old',
        'DashboardCustomize:',
        '  - DashboardCustomize: Width',
        '    Width: w-full',
        'Board:',
        '  - Board: B1',
        '    BoardCustomize:',
        '      - BoardCustomize: IsModal',
        '    Component:',
        '      - Component: Label',
        '        id: 9',
        '        LabelCustomize:',
        '          - LabelCustomize: Classes',
        '            LabelClasses: a',
        '        Label: hello',
        '',
    ].join("\n"),
})
const oldCanonical = implodeDashboard(oldFormDir)
assert.deepEqual(oldCanonical.DashboardCustomize, [{ DashboardCustomize: "Width", Width: "w-full" }])
assert.deepEqual(oldCanonical.Board[0].BoardCustomize, [{ BoardCustomize: "IsModal" }])
assert.deepEqual(oldCanonical.Board[0].Component[0].LabelCustomize, [{ LabelCustomize: "Classes", LabelClasses: "a" }])
const reflatDir = join(dashboardsRoot, "reflat")
writeDashboardDir(reflatDir, explodeDashboard(oldCanonical))
assert.ok(!readFileSync(join(reflatDir, "dashboard.yaml"), "utf8").includes("- LabelCustomize"))
assert.deepEqual(implodeDashboard(reflatDir), oldCanonical)

// ---------------------------------------------------------------------------------------------
// link-only dashboards (6.102.0): Link is hoisted to the root of dashboard.yaml like the other
// DashboardCustomize sub-fields, and the directory reads back to the same canonical
// ---------------------------------------------------------------------------------------------
const linkOnly = stripDerived(parseDashboardFull(serializeDashboard(cLinkOnly, definition)))
const linkOnlyFiles = explodeDashboard(linkOnly)
assert.ok(linkOnlyFiles["dashboard.yaml"].includes('DashboardCustomize: "Access\\0LinkOnly"'))
assert.ok(linkOnlyFiles["dashboard.yaml"].includes("\nLink: \"#/definitions/108/q=estado:aberto\""))
const linkOnlyDir = join(dashboardsRoot, "link-only")
writeDashboardDir(linkOnlyDir, linkOnlyFiles)
assert.deepEqual(implodeDashboard(linkOnlyDir), linkOnly)

console.log("test_repo_format: ALL TESTS PASSED")
