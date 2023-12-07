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
        <div v-if="dashboard.dashboardContext.user.isSystem" style="position: absolute;bottom: 5px;right: 5px;">
            <a :href="'/recordm/#/instance/'+dashboard.instanceId" target="_blank" rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" x="0px" y="0px" viewBox="0 0 100 100" width="27" height="27" class="icon outbound">
                    <path fill="currentColor" d="M18.8,85.1h56l0,0c2.2,0,4-1.8,4-4v-32h-8v28h-48v-48h28v-8h-32l0,0c-2.2,0-4,1.8-4,4v56C14.8,83.3,16.6,85.1,18.8,85.1z"></path> <polygon fill="currentColor" points="45.7,48.7 51.3,54.3 77.2,28.5 77.2,37.2 85.2,37.2 85.2,14.9 62.8,14.9 62.8,22.9 71.5,22.9"></polygon>
                </svg>
            </a>
        </div>
    </div>
</template>

<script>
    import Board from './Board.vue'
    import ComponentStatePersistence from "@/model/ComponentStatePersistence"

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
        },
    }
</script>