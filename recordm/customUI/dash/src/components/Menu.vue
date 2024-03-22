<template>
    <div :class="classes">
        <component v-for="(line, i) in lines" :is="line.componentTag"
            :key="i"
            :class="[line.classes,{'cursor-pointer': line.clickable}]"
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
          this.updatePersistenceMap(this.lines)
        },
        watch: {
          lines(newLines) {
            this.updatePersistenceMap(newLines)
          }
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
                        componentTag = "a"
                    }

                    const filterVarName = line["FilterVarName"];
                    const filterValue   = line["FilterValue"];
                    const clickHandler  = filterVarName ? ((_) => this.activateFromInputChange(filterVarName, filterValue)) : (() => true)

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
                        clickable: link || script || filterVarName
                    }
                })
            },
        },
        methods: {
          updatePersistenceMap(lines) {
            lines.forEach(l => {
              if(!this.statePersistencesMap[l.filterVarName]) {
                this.statePersistencesMap[l.filterVarName] = new ComponentStatePersistence(l.filterVarName, this.activateFromPersistenceChange(l.filterVarName))
              }
            });
          },
          activateFromInputChange(filterVarName, filterValue) {
            const statePersistence = this.statePersistencesMap[filterVarName];
            if (!statePersistence) {
              console.warn("State persistence not found for filter var name", filterVarName)
              return
            }

            const finalValue = statePersistence.content !== filterValue ? filterValue : ""

            statePersistence.content = finalValue
            this.$set(this.component.vars, filterVarName, finalValue)
          },
          activateFromPersistenceChange(filterVarName) {
            return (newContent) => {this.$set(this.component.vars, filterVarName, newContent)}
          },
        }
    }
</script>