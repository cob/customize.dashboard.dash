<template>
    <table :class="classes">
        <tr v-for="(line, i) in lines" :key="'line'+i" :class="line.lineClasses">
            <td  :class="line.titleClasses">
                {{ line.title }}
            </td>
            <td v-for="(value, j) in line.values" :key="'value'+inputFilter+i+'-'+j">
                <TotalsValue :value-data="value"/>
            </td>
        </tr>
    </table>
</template>

<script>
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
                return this.component['Line'].map( l => ({
                    title :       l['Line']                             || "",
                    lineClasses:  l["LineCustomize"][0]["LineClasses"]  || "text-right transition ease-in-out rounded ring-offset-0 hover:ring-1 ring-stone-300 ",
                    titleClasses: l["LineCustomize"][0]["TitleClasses"] || "text-left text-stone-600 p-1",
                    values:       l['Value']
            }))}
        },
        watch: {
            inputFilter(newValue) {
                if(newValue === "") return //PRESSUPOSTO IMPORTANTE: se newValue é vazio é porque estamos em transições (porque usamos sempre um valor, nem que seja *) e o melhor é usar o valor antigo para o valor não mudar momentaneamente (e ainda desperdicar uma pesquisa). Se o pressuposto for quebrado vamos impedir a actualização do inputFilter quando o valor é ""
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
                    let newFilter = ((arg || "") + " " + newValue.trim()) || "*"
                    if (v.dash_info && v.dash_info.changeArgs) v.dash_info.changeArgs({ query: newFilter })
                    });
                });
            }
        }
    }
</script>
