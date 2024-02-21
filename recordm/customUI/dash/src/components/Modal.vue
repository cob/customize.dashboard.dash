<template>
    <div class="absolute">
        <div ref="modal" class="relative z-10" aria-labelledby="modal-title" role="dialog" id="modal-pc" aria-modal="true">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full  items-center justify-center text-center ">
                    <div :class="`relative transform shadow-xl transition-all p-4 overflow-y-scroll ${this.classes}`">
                        <template v-for="(item, i) in components">
                            <Markdown v-if="item['Component'] === 'Markdown'" :component="item" :key="i" />
                            <Mermaid v-if="item['Component'] === 'Mermaid'" :component="item" :key="i" />
                            <Label v-if="item['Component'] === 'Label'" :component="item" :key="i" />
                            <Menu v-if="item['Component'] === 'Menu'" :component="item" :key="i" />
                            <Totals v-if="item['Component'] === 'Totals'" :component="item" :key="i" />
                            <Kibana v-if="item['Component'] === 'Kibana'" :component="item" :key="i" />
                            <Filtro v-if="item['Component'] === 'Filter'" :component="item" :key="i" />
                            <Calendar v-if="item['Component'] === 'Calendar'" :component="item" :key="i" />
                            <List v-if="item['Component'] === 'List'" :component="item" :key="i" />
                            <Slides v-if="item['Component'] === 'Slides'" :component="item" :key="i"
                                @show-modal="d => $emit('show-modal', d)" v-on="$listeners" />
                        </template>
                        <button type="button" class="rounded-lg bg-red-600 right-4 top-4 absolute cursor-pointer"
                            @click="$emit('show-modal', undefined)"> <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                                viewBox="0 0 24 24" stroke-width="1.5" stroke="white" class="w-6 h-6 m-1">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

// 
<script>
import Mermaid from './Mermaid.vue';
import Label from './Label.vue';
import Menu from './Menu.vue';
import Totals from './Totals.vue';
import Kibana from './Kibana.vue';
import Filtro from './Filter.vue';
import Calendar from './Calendar.vue';
import List from './List.vue';
import Markdown from './Markdown.vue';
import Slides from './Slides.vue';

export default {
    components: { Label, Menu, Totals, Kibana, Filtro, Calendar, List, Mermaid, Markdown, Slides },
    props: {
        board: Object
    },
    computed: {
        options() { return this.board['BoardCustomize'][0] },
        components() { return this.board['Component'] },
        classes() { return this.options['BoardClasses'] || "min-w-[80%] h-[70vh] rounded-lg bg-white text-left" },
        boards() { return this.dashboard['Board'] },
    },
    mounted() {
        document.addEventListener('keydown', this.onEsc);
    },
    beforeDestroy() {
        document.removeEventListener('keydown', this.onEsc);
    },
    methods: {
        onEsc(e) {
            if (e.key == 'Escape')
                this.$emit('show-modal', undefined)
        }
    }
}

</script>