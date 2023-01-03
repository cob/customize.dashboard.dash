<template>
    <div :class="classes">
        <a v-for="(line, i) in lines" 
            :key="i"
            :class="line.classes"
            :href="line.link"
        >
            <span>
                <i v-if="line.icon" :class="line.icon" style="margin-right:4px"></i>
                <span v-html="line.text"></span>
            </span>
            <Attention class="absolute right-1" :attentionInfo="line.attention"/>
        </a>
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
                let lines = this.component['Text'].map( line => ({
                    classes:   line["TextCustomize"][0]['TextClasses'] || "transition ease-in-out duration-300 rounded-md border border-gray-300 border-l-2 border-l-sky-600 shadow-sm transform hover:translate-x-0.5 p-2 bg-white",
                    icon:      line["TextCustomize"][0]['Icon'] || "",
                    text:      line['Text'] || "",
                    link:      line['Link'] || "",
                    attention: line["TextCustomize"][0]['AttentionInfo'],
                }))
                return lines
            }
        }
    }
</script>