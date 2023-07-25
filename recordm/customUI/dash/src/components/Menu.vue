<template>
    <div :class="classes">
        <component v-for="(line, i) in lines" :is="line.componentTag"
            :key="i"
            :class="line.classes"
            :href="line.link"
            :onClick="line.script"
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
    import Attention from './Attention.vue'

    export default {
        components: { Attention },
        props: { 
            component: Object
        },
        computed: {
            options() { return this.component['MenuCustomize'][0] },
            classes() { return this.options['MenuClasses']      || "flex flex-col gap-y-2" },             
            lines() {
                let lines = this.component['Text'].map( line => {
                    let script, componentTag
                    let link = line['Link']

                    if(link.startsWith('javascript:')) {
                        componentTag = "button"
                        script = link.substring('javascript:'.length)
                        link = ""
                    } else {
                        componentTag = "a"
                    }

                    return {
                        classes:      line["TextCustomize"][0]['TextClasses'] || "transition ease-in-out duration-300 rounded-md border border-gray-300 border-l-2 border-l-sky-600 shadow-sm transform hover:translate-x-0.5 p-2 bg-white",
                        icon:         line["TextCustomize"][0]['Icon'] || "",
                        text:         line['Text'] || "",
                        attention:    line["TextCustomize"][0]['AttentionInfo'],
                        link:         link || "",
                        script:       script || "",
                        componentTag: componentTag || "",
                    }
                })
                return lines
            }
        }
    }
</script>