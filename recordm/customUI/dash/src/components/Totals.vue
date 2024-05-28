<template>
    <table :class="classes">
        <tr v-for="(line, i) in lines" :key="'line' + i"  class="group" :class="line.lineClasses" @click="line.clickHandler">
            <template  v-if="line.customLink || line.script">
                <component :href="line.customLink" class="text-right contents" :is="line.componentTag" :onClick="line.script">
                    <td :class="line.titleClasses" :href="line.customLink || false" v-html="line.title+' '+line.line_icon_html"></td>
                    <td v-for="(value, j) in line.values" :key="'value' + inputFilter + i + '-' + j">
                        <TotalsValue :value-data="value" :clicker="line.clickHandler" :hasVars="line.hasVars"
                            :customLink="line.customLink" />
                    </td>
                </component>
            </template>
            <template v-else >
                <td :class="line.titleClasses" v-html="line.title+' '+line.line_icon_html" ></td>
                <td v-for="(value, j) in line.values" :key="'value' + inputFilter + i + '-' + j">
                    <TotalsValue :value-data="value" :clicker="line.clickHandler" :hasVars="line.hasVars"
                        :customLink="line.customLink" />
                </td>
            </template>
        </tr>
    </table>
</template>

<script>
import ComponentStatePersistence from "@/model/ComponentStatePersistence";
import TotalsValue from './TotalsValue.vue'

export default {
    components: { TotalsValue },
    props: {
        component: Object
    },
    computed: {
        options()     { return this.component['TotalsCustomize'][0] },
        classes()     { return this.options['TotalsClasses'] || "w-full table-auto" },
        inputs()      { return this.options['InputVarTotals'].map(v => v['InputVarTotals']) },
        inputFilter() { return this.inputs.filter(v => this.component.vars[v]).map(v => this.component.vars[v]).join(" ")},
        lines() {
            return this.component['Line'].map(l => {
                const filterTotalVarName = l['LineBehaviour'][0]["FilterTotalVarName"];
                const filterTotalValue = l['LineBehaviour'][0]["FilterTotalValue"];
                const clickHandler = filterTotalVarName ? ((_) => this.activateFromInputChange(filterTotalVarName, filterTotalValue)) : (() => false)
                const hasVars = filterTotalVarName ? true : false

                let customLink = l['LineBehaviour'][0]['LineLink'] || ""

                // Dynamic classes
                let l_classes = l["LineCustomize"][0]["LineClasses"] || "text-right transition ease-in-out rounded ring-offset-0 hover:ring-1 ring-stone-300 "
                if (hasVars || customLink) {
                    l_classes += " hover:bg-blue-200 hover:cursor-pointer "
                }

                // Line icon
                let line_icon_html = ""
                if (hasVars) (
                    line_icon_html = "<i class='fa-solid fa-filter text-md text-slate-400 invisible group-hover:visible'></i>"
                )
                if (customLink) {
                    line_icon_html = "<i class='fa-solid fa-link text-md text-slate-400 opacity-0 group-hover:opacity-100'></i>"
                }

                // "Hack" used in Menu to run javascript via "Link" field
                let script, componentTag
                if(customLink && customLink.startsWith('javascript:')) {
                        componentTag = "button"
                        script = customLink.substring('javascript:'.length)
                        customLink = ""
                    } else {
                        componentTag = "a"
                }

                return {
                    title: l['Line'] || "",
                    lineClasses: l_classes,
                    titleClasses: l["LineCustomize"][0]["TitleClasses"] || "text-left text-stone-600 p-1 items-center",
                    values: l['Value'],
                    filterTotalVarName,
                    filterTotalValue,
                    clickHandler,
                    hasVars,
                    customLink,
                    line_icon_html,
                    script:       script || "",
                    componentTag: componentTag || "",
                }
            })
        },
    },
    watch: {
        lines(newLines) {
            this.updateQuery()
            this.updatePersistenceMap(newLines)
        },
        inputFilter() {
            this.updateQuery()
        },
    },
    data: () => ({
        statePersistencesMap: {}
    }),
    created() {
        this.updatePersistenceMap(this.lines)
    },
    beforeDestroy() {
        Object.keys(this.statePersistencesMap)
            .forEach(key => this.statePersistencesMap[key].stop())
    },
    methods: {
        updateQuery() {
            let inputFilter = this.inputFilter;
            if(inputFilter === "") return //PRESSUPOSTO IMPORTANTE: se newValue é vazio é porque estamos em transições (porque usamos sempre um valor, nem que seja *) e o melhor é usar o valor antigo para o valor não mudar momentaneamente (e ainda desperdicar uma pesquisa). Se o pressuposto for quebrado vamos impedir a actualização do inputFilter quando o valor é ""
                this.lines.forEach(l => {
                    l.values.forEach(v => {
                    let index
                    switch (v.Value) {
                        case "dmEquipmentCount":
                            index = 0;
                            break;
                        case "definitionCount":
                        case "domainCount":
                        case "instancesList":
                            index = 1;
                            break;
                        case "fieldSum":
                        case "fieldAverage":
                            index = 2;
                            break;
                        case "fieldWeightedAverage":
                            index = 3;
                            break;
                    }

                    let arg = (v.Arg[index] instanceof Object ? v.Arg[index].Arg : v.Arg[index])
                    let filter = ((arg || "") + " " + inputFilter.trim()) || "*"
                    if (v.dash_info && v.dash_info.changeArgs) v.dash_info.changeArgs({ query: filter })
                });
            })
        },
        updatePersistenceMap(lines) {
            lines.forEach(l => {
                if (!this.statePersistencesMap[l.filterTotalVarName]) {
                    this.statePersistencesMap[l.filterTotalVarName] = new ComponentStatePersistence(l.filterTotalVarName, this.activateFromPersistenceChange(l.filterTotalVarName))
                }
            });
        },
        activateFromInputChange(filterTotalVarName, filterTotalValue) {
            const statePersistence = this.statePersistencesMap[filterTotalVarName];
            if (!statePersistence) {
                console.warn("State persistence not found for filter var name", filterTotalVarName)
                return
            }

            const finalValue = statePersistence.content !== filterTotalValue ? filterTotalValue : ""

            statePersistence.content = finalValue
            this.$set(this.component.vars, filterTotalVarName, finalValue)
        },
        activateFromPersistenceChange(filterTotalVarName) {
            return (newContent) => { this.$set(this.component.vars, filterTotalVarName, newContent) }
        },
    }
}
</script>
