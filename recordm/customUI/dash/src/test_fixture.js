// Shared test fixture: a hand-written canonical dashboard with the patterns found in real
// dashboards (multi-select \u0000 values, $file images, duplicables, Context with escapes and
// handlebars, typed components with field ids, block-helpers in duplicated field values), plus
// helpers to load the repo's Dashboard_v1 definition with deterministic field ids (the repo copy
// ships without ids -- they are server-assigned -- and they are needed to build $file urls).
import { readFileSync } from 'node:fs'

const definitionUrl = new URL('../../../../others/customize.dashboard.dash/definitions/dashboard_v1.json', import.meta.url)

function loadNumberedDefinition() {
    const definition = JSON.parse(readFileSync(definitionUrl, 'utf8'))
    let nextDefId = 9000
    const numberDefs = (defs) => defs.forEach(d => {
        if (d.id == null) d.id = ++nextDefId
        numberDefs(d.fields || [])
    })
    numberDefs(definition.fieldDefinitions)
    return definition
}

const findDef = (defs, path) => {
    const def = defs.find(d => d.name === path[0])
    if (!def) throw new Error("definition field not found: " + path[0])
    return path.length === 1 ? def : findDef(def.fields, path.slice(1))
}

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

export { c0, loadNumberedDefinition, findDef }
