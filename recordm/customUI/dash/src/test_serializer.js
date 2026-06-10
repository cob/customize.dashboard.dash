// Round-trip tests for serializer.js (the inverse of parseDashboard).
// Run with: node src/test_serializer.js   (Node >= 22)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseDashboard } from './collector.js'
import { serializeDashboard, parseDashboardExtras } from './serializer.js'
import { generateDashboardTemplate } from './template_generator.js'
import Handlebars from 'handlebars'

// ---------------------------------------------------------------------------------------------
// Setup: load the real Dashboard_v1 definition. The repo copy ships without field ids (they are
// server-assigned), so we assign deterministic ones — they are needed to build $file urls.
// ---------------------------------------------------------------------------------------------
const definitionUrl = new URL('../../../../others/customize.dashboard.dash/definitions/dashboard_v1.json', import.meta.url)
const definition = JSON.parse(readFileSync(definitionUrl, 'utf8'))

let nextDefId = 9000
const numberDefs = (defs) => defs.forEach(d => {
    if (d.id == null) d.id = ++nextDefId
    numberDefs(d.fields || [])
})
numberDefs(definition.fieldDefinitions)

const findDef = (defs, path) => {
    const def = defs.find(d => d.name === path[0])
    if (!def) throw new Error("definition field not found: " + path[0])
    return path.length === 1 ? def : findDef(def.fields, path.slice(1))
}

// The full canonical representation = what parseDashboard captures + the extra root fields
// (Solution/Description/Order) needed by a repo representation
const parseFull = (raw) => ({ ...parseDashboard(raw), ...parseDashboardExtras(raw) })

// ---------------------------------------------------------------------------------------------
// Fixture: a hand-written canonical dashboard, with the patterns found in real dashboards
// (multi-select \u0000 values, $file images, duplicables, Context with escapes and handlebars,
//  typed components with field ids, block-helpers in duplicated field values)
// ---------------------------------------------------------------------------------------------
const c0 = {
    instanceId: "458930",
    version: "7",
    Name: "Plan Test",
    Description: "Dashboard de teste do round-trip",
    Order: "30",
    Solution: "389730",
    DashboardCustomize: [{
        DashboardCustomize: "Classes\u0000Width\u0000Grid\u0000Access\u0000Vars\u0000Context\u0000DragDrop",
        DashboardClasses: "h-full bg-cover bg-center overflow-auto p-3",
        Width: "w-full",
        Grid: "grid grid-flow-row-dense md:grid-cols-12",
        Image: "background.jpg", // $image (not $file): must NOT be turned into a url
        GroupAccess: [
            { GroupAccess: "FUNC COB Support" },
            { GroupAccess: "DASH Clientes" },
        ],
        Variables: [
            { VarName: "todayVar", "Initial Value": "{{todayTimestamp}}" },
            { VarName: "switchView", "Initial Value": "yes" },
        ],
        Context: '{ "responsavel": distinct("Ticket","responsável_username","((-estado:fechado) OR (estado:fechado data_conclusão.date:now\\\\/w)) AND {{vars.filtro}}*",500), "escaped": "data.date:now\\\\/w" }',
        DragDropConcurrent: "provision_ticket",
        UpdateOnDrop: "0.5",
    }],
    Board: [
        {
            Board: "Title",
            BoardCustomize: [{
                BoardCustomize: "Classes\u0000Image",
                BoardClasses: "col-span-12 relative",
                Image: "fundo.png", // $file: parse must turn it into the instance files url
            }],
            Component: [
                {
                    Component: "Label", id: 9001,
                    LabelCustomize: [{
                        LabelCustomize: "Classes\u0000Image",
                        LabelClasses: "text-right sm:text-center font-bold p-2 text-4xl",
                        Image: "logo do cliente.png", // $file
                    }],
                    Label: "Equipa (esta semana)",
                },
                {
                    Component: "Filter", id: 9002,
                    FilterCustomize: [{ FilterCustomize: "Placeholder", Placeholder: "Filtrar..." }],
                    OutputVarFilter: "filtro",
                },
                {
                    Component: "Totals", id: 9003,
                    TotalsCustomize: [{ TotalsCustomize: "Classes", TotalsClasses: "absolute top-1 right-3" }],
                    Line: [{
                        Line: "Tickets",
                        LineCustomize: [{ LineCustomize: "LineClasses", LineClasses: "text-right" }],
                        Value: [
                            {
                                Value: "Label",
                                ValueCustomize: [{ ValueCustomize: "Classes", ValueClasses: "Default Success text-sm" }],
                                Arg: [{ Arg: "Total:" }],
                            },
                            {
                                Value: "definitionCount",
                                Arg: [
                                    { Arg: "Ticket" },
                                    { Arg: "(estado:fechado) {{vars.filtro}}*" },
                                ],
                            },
                        ],
                    }],
                },
            ],
        },
        {
            Board: "{{#each work_list}} {{this.name}}",
            BoardCustomize: [{ BoardCustomize: "Classes", BoardClasses: "col-span-12 md:col-span-4 p-4 m-1" }],
            Component: [
                {
                    Component: "Menu", id: 9004,
                    MenuCustomize: [{ MenuCustomize: "Classes", MenuClasses: "flex flex-col gap-y-2" }],
                    Text: [
                        {
                            Text: "Home",
                            Link: "#/cob.custom-resource/Home/dash",
                            TextCustomize: [{
                                TextCustomize: "Classes\u0000Icon",
                                TextClasses: "rounded-md border p-1",
                                Icon: "fa-solid fa-house",
                            }],
                        },
                        {
                            Text: '{{#each @root.ticketState}}<div title="{{label}}">{{label}}</div>',
                            FilterVarName: "ticketStateVar",
                            FilterValue: "{{query}}",
                        },
                    ],
                },
                {
                    Component: "Calendar", id: 9005,
                    CalendarCustomize: [{
                        CalendarCustomize: "InputVar\u0000Settings",
                        InputVarCalendar: [{ InputVarCalendar: "filtroVar" }, { InputVarCalendar: "outputHierarchy" }],
                        MaxVisibleDayEvents: "20",
                        EventViews: "dayGridWeek,dayGridMonth,listMonth",
                    }],
                    Events: [
                        {
                            Definition: "Interacção com Empresa",
                            DateStartEventField: "Data",
                            DateEndEventField: "Data",
                            DescriptionEventField: "{|{descrição}|}",
                            EventsQuery: "* {{filtroVar}}*",
                            AllDay: "False",
                        },
                        {
                            Definition: "Ticket",
                            DateStartEventField: "Planned Week",
                            AllDay: "True",
                        },
                    ],
                },
                {
                    Component: "List", id: 9006,
                    ListCustomize: [{
                        ListCustomize: "InputVar\u0000SetDefaultView",
                        InputVarList: [{ InputVarList: "filtroVar2" }, { InputVarList: "outputHierarchy" }],
                        DefaultView: "Geral",
                    }],
                    ListDefinition: "Ticket",
                    ListQuery: "* {{filtroVar2}}*",
                },
                {
                    Component: "Hierarchy", id: 9007,
                    HierarchyCustomize: [{ HierarchyCustomize: "Classes", HierarchyNodeClasses: "text-red-500 font-bold" }],
                    DefinitionNameHierarchy: "Actividades",
                    ParentFieldName: "Actividade Envolvente",
                    SortFieldName: "ordem",
                    DisplayFieldHierarchy: "Nome",
                    FilterHierarchy: "{{#if vars.x}} {{vars.x}} {{else}} * {{/if}}",
                    OutputVarHierarchy: "outputHierarchy",
                },
            ],
        },
        {
            Board: "Modal Info",
            BoardCustomize: [{ BoardCustomize: "IsModal", BoardClasses: "col-span-12 m-40 bg-white" }],
            Component: [
                {
                    Component: "Markdown", id: 9008,
                    MDContent: "## Relatório\ncom **markdown** e\nvárias linhas",
                },
                {
                    Component: "ModalActivator", id: 9009,
                    ModalActivatorCustomize: [{ ModalActivatorCustomize: "Classes", ModalActivatorClasses: "cursor-pointer text-gray-600" }],
                    ModalBoardName: "Modal Info",
                    ModalActivatorText: '<i class="fa-regular fa-file-lines"></i> Relatório',
                },
            ],
        },
    ],
}

// ---------------------------------------------------------------------------------------------
// serialize(c0) -> raw1 -> parse -> c1 : spot-check that everything was captured
// ---------------------------------------------------------------------------------------------
const raw1 = serializeDashboard(c0, definition)
assert.equal(raw1.id, 458930)
assert.equal(raw1.version, 7)

const c1 = parseFull(raw1)

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

// normalization: template keys without a matching definition field stay as residues ("noButton",
// "Style Value", ...) and unfilled customize groups converge to [{}]
assert.deepEqual(c1.Board[0].Component[1].FilterCustomize, [{ noButton: "", Placeholder: "Filtrar...", FilterCustomize: "Placeholder" }])
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
const c2 = parseFull(raw2)
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
