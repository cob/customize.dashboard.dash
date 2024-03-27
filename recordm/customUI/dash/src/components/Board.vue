<template>
    <div :class="classes" :style="image">
        <template v-for="(item, i) in components">
            <Markdown  v-if="item['Component'] === 'Markdown'"  :component="item" :key="i"/>
            <Mermaid   v-if="item['Component'] === 'Mermaid'"   :component="item" :key="i" />
            <Label     v-if="item['Component'] === 'Label'"     :component="item" :key="i" />
            <Menu      v-if="item['Component'] === 'Menu'"      :component="item" :key="i" />
            <Totals    v-if="item['Component'] === 'Totals'"    :component="item" :key="i" />
            <Kibana    v-if="item['Component'] === 'Kibana'"    :component="item" :key="i" />
            <Filtro    v-if="item['Component'] === 'Filter'"    :component="item" :key="i" />
            <Calendar  v-if="item['Component'] === 'Calendar'"  :component="item" :key="i" />
            <List      v-if="item['Component'] === 'List'"      :component="item" :key="i" />
            <Activator v-if="item['Component'] === 'ModalActivator'" :component="item" :key="i" @show-modal="d => $emit('show-modal', d)"/>
            <Slides    v-if="item['Component'] === 'Slides'"      :component="item" :key="i" v-on="$listeners" @show-modal="d => $emit('show-modal', d)"/>    
            <Hierarchy v-if="item['Component'] === 'Hierarchy'" :component="item" />
        </template>
    </div>
</template>

<script>
    import Label  from './Label.vue'
    import Menu   from './Menu.vue'
    import Totals from './Totals.vue'
    import Kibana from './Kibana.vue'
    import Filtro from './Filter.vue'
    import Calendar from './Calendar.vue'
    import List   from './List.vue'
    import Mermaid from './Mermaid.vue'
    import Activator from './Activator.vue'
    import Markdown from './Markdown.vue'
    import Slides from './Slides.vue'
import Hierarchy from './Hierarchy.vue'

    export default {
        components: { Label, Menu, Totals, Kibana, Filtro, Calendar, List, Mermaid, Activator, Markdown, Slides, Hierarchy },
        props: {
          board: Object
        },
        computed: {
            options()    { return this.board['BoardCustomize'][0] },
            components() { return this.board['Component'] },
            classes()    { return this.options['BoardClasses'] || "col-span-12 md:col-span-4 rounded-md border border-gray-300 bg-white bg-opacity-70 p-4 m-1" },
            image()      { return this.options['Image'] ? "background-image: url(" + this.options['Image'] +  ");" : "" }
        }
    }
</script>
