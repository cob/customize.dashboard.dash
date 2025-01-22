<template>
    <div class="h-full" :class="classes" :style="image" >
        <div class="flex flex-row flex-wrap justify-end gap-1 mb-10"> 
            <a v-for="(item,i) in menu" :key="item.name+i" :href="item.href" :class="item.active?'bg-lime-100':'bg-white'" class="rounded  py-1 px-2 text-xs min-w-fit whitespace-nowrap font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-lime-100" v-html="item.name"></a>
        </div>
        
        <div>
            <div :class="width + ' ' + grid" >
                <template  v-for="(board,i) in boards">
                    <Modal v-if="isModal(board) && board.Board == activeModal" :board="board" :key="dashboard.instanceId + '-modal-' + i"  @show-modal="toggleModal" v-on="$listeners" :refreshFlag="refreshFlag"/>
                    <Board v-else-if="!isModal(board)" :board="board" :key="dashboard.instanceId + '-' + i" :dashboard="dashboard" @show-modal="toggleModal" v-on="$listeners" :refreshFlag="refreshFlag"/>
                </template>
            </div>
        </div>
        <div v-if="dashboard.dashboardContext.user.isSystem" style="position: absolute;bottom: 5px;right: 5px;" class="text-lg">
            <a :href="'#/instance/'+dashboard.instanceId" target="_blank" rel="noopener noreferrer" class="px-1.5 py-0.5 rounded bg-white bg-opacity-30">
                <i class="fa-regular fa-pen-to-square"></i>
            </a>
            <a :href="'#/instance/duplicate/'+dashboard.instanceId" target="_blank" rel="noopener noreferrer" class="px-1.5 py-0.5 rounded bg-white bg-opacity-30 ml-2">
                <i class="fa-regular fa-clone"></i>
            </a>
        </div>
    </div>
</template>

<script>
import Board from './Board.vue'
import Modal from './Modal.vue'
import ComponentStatePersistence from "@/model/ComponentStatePersistence"


    export default {
        components: { Board, Modal },
        props: {
          dashboard: Object,
          menu: Array,
          refreshFlag: Number
        },
        data: () => ({
          activeModal : String
        }),
        created() {
            this.statePersistence = {}
            this.updateVars(this.vars)
        },
        beforeDestroy() {
            Object.keys(this.vars).forEach (
                //TODO: fix - sometimes we get this.vars with [null]. We currently test but this shouldn't happen       
                v => this.statePersistence[v] && this.statePersistence[v].stop())  
        },
        computed: {
            options() { return this.dashboard['DashboardCustomize'][0] },
            boards()  { return this.dashboard['Board'] },
            classes() { return this.options['DashboardClasses'] || "h-full bg-cover bg-center overflow-auto p-3" },
            width()   { return this.options['Width']            || "max-w-6xl mx-auto" },
            grid()    { return this.options['Grid']             || "grid grid-flow-row-dense md:grid-cols-12" },
            vars()    { return this.options['Variables'].reduce( (vars, v) => {vars[v['VarName']] = v['Initial Value']; return vars}, {}) },
            image()   { return this.options['Image'] ? "background-image: url(" + this.options['Image'] +  ");" : "" }
        },
        watch: {
            dashboard(old, neww) { 
                if(old.instanceId == neww.instanceId) return;
                this.statePersistence = {}
                this.updateVars(this.vars)
            },
            vars(newVars) { this.updateVars(newVars) }
        },
        methods: {
            updateVars(vars)  {
                Object.entries(vars).forEach( entry => {
                    const name = entry[0]
                    const value = entry[1]
                    
                    if(!this.statePersistence[name])
                        this.statePersistence[name] = new ComponentStatePersistence(name, this.activateFromPersistenceChange(name))
                    
                    if(name && value && !this.statePersistence[name].content) {
                        this.statePersistence[name].content = value 
                        this.dashboard.dashboardContext.vars[name] = this.statePersistence[name].content
                    }

                  
                })
              },
            activateFromPersistenceChange(varName) {
                return (newContent) => {
                    this.$set(this.dashboard.dashboardContext.vars, varName, newContent)
                }
            },
            toggleModal(payload) {
                this.activeModal = payload
            },
            isModal(board) {
                const options = board['BoardCustomize'][0]['BoardCustomize']
                if (options)
                    return options.split("\u0000").indexOf("IsModal") !== -1
            }
        }
    }
</script>