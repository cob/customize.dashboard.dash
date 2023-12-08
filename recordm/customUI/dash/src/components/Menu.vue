<template>
    <div :class="classes">
        <component v-for="(line, i) in lines" :is="line.componentTag"
            :key="i"
            :class="[line.classes,'cursor-pointer']"
            :href="line.link || false"
            :onClick="line.script"
            @click="line.clickHandler"
        >
            <span>
                <i v-if="line.icon" :class="line.icon" style="margin-right:4px"></i>
                <span v-html="line.text"></span>
            </span>
            <Attention class="absolute right-1" :attentionInfo="line.attention"/>
        </component>
    </div>
</template>

<script>
    import ComponentStatePersistence from "@/model/ComponentStatePersistence";
    import Attention from './Attention.vue'

    export default {
        components: { Attention },
        props: {
            component: Object
        },
        data: () => ({
          statePersistencesMap: {}
        }),
        created() {
          this.lines.forEach(l => this.statePersistencesMap[l.filterVarName] = new ComponentStatePersistence(l.filterVarName, this.activateFromPersistenceChange(l.filterVarName)));
        },
        beforeDestroy() {
          Object.keys(this.statePersistencesMap)
            .forEach(key => this.statePersistencesMap[key].stop())
        },
        computed: {
            options() { return this.component['MenuCustomize'][0] },
            classes() { return this.options['MenuClasses'] || "flex flex-col gap-y-2" },
            lines() {
                return this.component['Text'].map( line => {
                    let script, componentTag
                    let link = line['Link']

                    if(link && link.startsWith('javascript:')) {
                        componentTag = "button"
                        script = link.substring('javascript:'.length)
                        link = ""
                    } else {
                        if (!link) link = "";
                        componentTag = "a"
                    }

                    const filterVarName = line["TextCustomize"][0]["FilterVarName"];
                    const filterValue = line["TextCustomize"][0]["FilterValue"];
                    const clickHandler = filterVarName ? ((_) => this.activateFromInputChange(filterVarName, filterValue)) : (() => true)

                    return {
                        classes:      line["TextCustomize"][0]['TextClasses'] || "transition ease-in-out duration-300 rounded-md border border-gray-300 border-l-2 border-l-sky-600 shadow-sm transform hover:translate-x-0.5 p-2 bg-white",
                        icon:         line["TextCustomize"][0]['Icon'] || "",
                        text:         line['Text'] || "",
                        attention:    line["TextCustomize"][0]['AttentionInfo'],
                        link:         link || "",
                        script:       script || "",
                        componentTag: componentTag || "",
                        filterVarName,
                        filterValue,
                        clickHandler,
                        clickable: link || script || filterValue
                    }
                })
            },
        },
        methods: {
          activateFromInputChange(filterVarName, filterValue) {
            const statePersistence = this.statePersistencesMap[filterVarName];
            if (!statePersistence) {
              console.warn("State persistence not found for filter var name", filterVarName)
              return
            }

            statePersistence.content = statePersistence.content !== filterValue ? filterValue : ""
            this.$set(this.component.vars, filterVarName, filterValue)
          },
          activateFromPersistenceChange(filterVarName) {
            return (newContent) => {this.$set(this.component.vars, filterVarName, newContent)}
          },
        }
    }
</script>