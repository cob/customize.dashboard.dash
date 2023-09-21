<template>
    <div class="h-full" :class="classes" :style="image" >
        <div class="flex flex-row flex-wrap justify-end gap-1 mb-10"> 
            <a v-for="(item,i) in menu" :key="item.name+i" :href="item.href" :class="item.active?'bg-lime-100':'bg-white'" class="rounded  py-1 px-2 text-xs min-w-fit whitespace-nowrap font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-lime-100" v-html="item.name"></a>
        </div>
        
        <div>
            <div :class="width + ' ' + grid">
                <Board v-for="(board,i) in boards" :board="board" :key="board.instanceId+'-'+i" />
            </div>
        </div>
    </div>
</template>

<script>
    import Board from './Board.vue'

    export default {
        components: { Board },
        props: {
          dashboard: Object,
          menu: Array
        },
        computed: {
            options() { return this.dashboard['DashboardCustomize'][0] },
            boards()  { return this.dashboard['Board'] },
            classes() { return this.options['DashboardClasses'] || "h-full bg-cover bg-center overflow-auto p-3" },
            width()   { return this.options['Width']            || "max-w-6xl mx-auto" },
            grid()    { return this.options['Grid']             || "grid grid-flow-row-dense md:grid-cols-12" },
            image()   { return this.options['Image'] ? "background-image: url(" + this.options['Image'] +  ");" : "" }
        }
    }
</script>
