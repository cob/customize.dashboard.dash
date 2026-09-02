// Round-trip tests for serializer.js (the inverse of parseDashboard).
// Run with: node src/test_serializer.js   (Node >= 22)
import assert from 'node:assert/strict'
import { serializeDashboard, parseDashboardFull, adoptFieldIds } from './serializer.js'
import { generateDashboardTemplate } from './template_generator.js'
import Handlebars from 'handlebars'

import { c0, loadNumberedDefinition, findDef } from './test_fixture.js'

const definition = loadNumberedDefinition()

// ---------------------------------------------------------------------------------------------
// serialize(c0) -> raw1 -> parse -> c1 : spot-check that everything was captured
// ---------------------------------------------------------------------------------------------
const raw1 = serializeDashboard(c0, definition)
assert.equal(raw1.id, 458930)
assert.equal(raw1.version, 7)

const c1 = parseDashboardFull(raw1)

assert.equal(c1.instanceId, "458930")
assert.equal(c1.version, "7")
assert.equal(c1.Name, "Plan Test")
assert.equal(c1.Description, "Dashboard de teste do round-trip")
assert.equal(c1.Order, "30")
assert.equal(c1.Solution, "389730")

const dc = c1.DashboardCustomize[0]
assert.equal(dc.DashboardCustomize, "Classes\u0000Width\u0000Grid\u0000Access\u0000Vars\u0000Context\u0000DragDrop")
assert.equal(dc.Image, "background.jpg") // $image: untouched
assert.equal(dc.Context, c0.DashboardCustomize[0].Context) // escapes preserved verbatim
assert.equal(dc.UpdateOnDrop, "0.5")
assert.deepEqual(dc.GroupAccess, [{ GroupAccess: "FUNC COB Support" }, { GroupAccess: "DASH Clientes" }])
assert.deepEqual(dc.Variables, [
    { VarName: "todayVar", "Initial Value": "{{todayTimestamp}}" },
    { VarName: "switchView", "Initial Value": "yes" },
])

// $file fields become urls built from instanceId + fieldDefinition id (see collect in collector.js)
const boardImageDefId = findDef(definition.fieldDefinitions, ["Board", "BoardCustomize", "Image"]).id
const labelImageDefId = findDef(definition.fieldDefinitions, ["Board", "Component", "LabelCustomize", "Image"]).id
assert.equal(c1.Board[0].BoardCustomize[0].Image, "/recordm/recordm/instances/458930/files/" + boardImageDefId + "/fundo.png")
assert.equal(c1.Board[0].Component[0].LabelCustomize[0].Image, "/recordm/recordm/instances/458930/files/" + labelImageDefId + "/logo do cliente.png")

// boards keep their order, get the Dash info and the typed components with their field ids
assert.equal(c1.Board.length, 3)
assert.deepEqual(c1.Board[0].Dash, { id: "458930", name: "Plan Test" })
assert.deepEqual(c1.Board.map(b => b.Component.map(c => c.Component + "/" + c.id)), [
    ["Label/9001", "Filter/9002", "Totals/9003"],
    ["Menu/9004", "Calendar/9005", "List/9006", "Hierarchy/9007"],
    ["Markdown/9008", "ModalActivator/9009"],
])

// normalization: template keys without a matching definition field stay as residues ("Style
// Value" in this fixture's definition) and unfilled customize groups converge to [{}]
assert.deepEqual(c1.Board[0].Component[1].FilterCustomize, [{ Placeholder: "Filtrar...", FilterCustomize: "Placeholder" }])
const totals = c1.Board[0].Component[2]
assert.equal(totals.Line[0].Line, "Tickets")
assert.equal(totals.Line[0].Value[0]["Style Value"], "")
assert.deepEqual(totals.Line[0].Value[1].Arg, [{ Arg: "Ticket" }, { Arg: "(estado:fechado) {{vars.filtro}}*" }])
assert.deepEqual(totals.Line[0].LineBehaviour, [{}])
assert.deepEqual(totals.TotalsCustomize[0].InputVarTotals, [{}])
const menu = c1.Board[1].Component[0]
assert.deepEqual(menu.Text[1].TextCustomize, [{}])
assert.equal(menu.Text[1].FilterVarName, "ticketStateVar")
assert.equal(menu.Text[0].TextCustomize[0].Icon, "fa-solid fa-house")

// calendar events are a $group: occurrences have no own value, only the children
const calendar = c1.Board[1].Component[1]
assert.equal(calendar.Events.length, 2)
assert.equal(calendar.Events[0].DescriptionEventField, "{|{descrição}|}")
assert.equal(calendar.Events[1].DateStartEventField, "Planned Week")
assert.ok(!("Events" in calendar.Events[0]))
assert.deepEqual(calendar.CalendarCustomize[0].InputVarCalendar, [{ InputVarCalendar: "filtroVar" }, { InputVarCalendar: "outputHierarchy" }])

assert.equal(c1.Board[2].Component[0].MDContent, "## Relatório\ncom **markdown** e\nvárias linhas")

// ---------------------------------------------------------------------------------------------
// Round-trip: serialize(c1) -> raw2 -> parse -> c2 must be exactly c1 (fixed point)
// ---------------------------------------------------------------------------------------------
const raw2 = serializeDashboard(c1, definition)
const c2 = parseDashboardFull(raw2)
assert.deepEqual(c2, c1)

// and the $file url was inverted back to the stored file name in the serialized instance
const findFieldByDefId = (fields, defId) => {
    for (const field of fields) {
        if (field.fieldDefinition.id === defId) return field
        const found = findFieldByDefId(field.fields, defId)
        if (found) return found
    }
    return null
}
assert.equal(findFieldByDefId(raw2.fields, labelImageDefId).value, "logo do cliente.png")
assert.equal(findFieldByDefId(raw2.fields, boardImageDefId).value, "fundo.png")

// ---------------------------------------------------------------------------------------------
// the serialized instance embeds only the minimal fieldDefinition (id/name/description): the
// full definition node repeats its `fields` subtree and `descendents` list at every level and
// inflated a real PUT body to 8MB (413 from nginx). The size guard keeps this from regressing.
// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------
// adoptFieldIds mimics an editor save: server ids everywhere, and for fields OUTSIDE the
// canonical representation ($auto fields like "Solution Sigla") the SERVER's value is kept -
// pushing null there made RecordM re-materialize the value into a second occurrence and reject
// the PUT with 400 NOT_DUPLICABLE_FIELD. Managed fields keep OUR value (null included = clear).
// ---------------------------------------------------------------------------------------------
const siglaDefId = findDef(definition.fieldDefinitions, ["Solution", "Solution Sigla"]).id
const nameDefId = findDef(definition.fieldDefinitions, ["Name"]).id
const serverInstance = serializeDashboard(c0, definition)
findFieldByDefId(serverInstance.fields, siglaDefId).value = "ACTV"
findFieldByDefId(serverInstance.fields, siglaDefId).id = 9673580
findFieldByDefId(serverInstance.fields, nameDefId).value = "Old Name"
const adopted = adoptFieldIds(serializeDashboard(c0, definition), serverInstance)
assert.equal(findFieldByDefId(adopted.fields, siglaDefId).id, 9673580)
assert.equal(findFieldByDefId(adopted.fields, siglaDefId).value, "ACTV") // server-owned
assert.equal(findFieldByDefId(adopted.fields, nameDefId).value, "Plan Test") // ours

// ---------------------------------------------------------------------------------------------
// the real definitions endpoint returns fieldDefinitions FLAT (every field of the tree in
// pre-order, subtrees still attached): serialization must rebuild the tree, or every nested
// field gains a rogue root occurrence (real PUT bounced with 400 NOT_DUPLICABLE_FIELD)
// ---------------------------------------------------------------------------------------------
const flattenDefs = (defs) => defs.flatMap(d => [d, ...flattenDefs(d.fields || [])])
const flatDefinition = { ...definition, fieldDefinitions: flattenDefs(definition.fieldDefinitions) }
assert.deepEqual(serializeDashboard(c0, flatDefinition), serializeDashboard(c0, definition))

const raw1Json = JSON.stringify(raw1)
assert.ok(!raw1Json.includes('"descendents"'))
const checkMinimalDefs = (fields) => fields.forEach(field => {
    assert.ok(Object.keys(field.fieldDefinition).every(k => ["id", "name", "description"].includes(k)),
        "unexpected fieldDefinition keys: " + Object.keys(field.fieldDefinition).join(","))
    checkMinimalDefs(field.fields)
})
checkMinimalDefs(raw1.fields)
assert.ok(raw1Json.length < 200 * 1024, "serialized c0 grew to " + Math.round(raw1Json.length / 1024) + " KB")

// ---------------------------------------------------------------------------------------------
// End-to-end smoke test: the canonical representation must feed the real template pipeline
// (generateDashboardTemplate -> Handlebars -> cleanup -> JSON), like App.vue does at runtime
// ---------------------------------------------------------------------------------------------
const template = generateDashboardTemplate(c1)
assert.ok(template.includes("{{#each work_list}}"))
assert.ok(template.includes("{{#each @root.ticketState}}"))

const processed = Handlebars.compile(template)({
    vars: { filtro: "abc" },
    work_list: [{ name: "Col A" }, { name: "Col B" }],
    ticketState: [{ label: "Análise" }, { label: "Aberto" }],
})
// same cleanup applied by buildDashboard in App.vue
let dashStr = processed
while (dashStr.match(/,\s*]/)) {
    dashStr = dashStr.replaceAll(/,\s*]/g, "]")
}
dashStr = dashStr.replaceAll(/(,(\s*))+/g, ",$2")
dashStr = dashStr.replaceAll(/(?<!\\)\n/g, "\\n")
dashStr = dashStr.replaceAll(/	/g, "\\t")
const dashProcessed = JSON.parse(dashStr)

// the {{#each work_list}} board expanded into one board per element, in place
assert.equal(dashProcessed.Board.length, 4)
assert.equal(dashProcessed.Board[1].Board.trim(), "Col A")
assert.equal(dashProcessed.Board[2].Board.trim(), "Col B")
// the {{#each @root.ticketState}} menu entry expanded into one Text per element
assert.equal(dashProcessed.Board[1].Component[0].Text.length, 3)
assert.ok(dashProcessed.Board[1].Component[0].Text[1].Text.includes("Análise"))
assert.ok(dashProcessed.Board[1].Component[0].Text[2].Text.includes("Aberto"))
// and the context vars were evaluated where used
assert.ok(dashProcessed.DashboardCustomize[0].Context.includes("AND abc*"))

console.log("test_serializer: ALL TESTS PASSED")
