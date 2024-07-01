<template>
    <div>
        <button class="float-right text-[10px] uppercase text-slate-400 hover:text-slate-500 border-slate-200  hover:border-slate-300 hover:shadow-none  py-0 px-1 rounded-sm" @click="clear" >
            Limpar
        </button>
        <template v-for="(top, i) in tops">
            <HierarchyNode class="pb-1" :selectedPath="selectedPath" :setOutput="setOutput" :instance="instances[top]"
                :tree="tree" :instances="instances" :nodeClasses="hierarchyNodeClasses" :displayField="displayField" :key="i" />
        </template>
        <template v-if="tops && tops.length == 0">
            No results
        </template>
    </div>
</template>

<script>
import ComponentStatePersistence from "@/model/ComponentStatePersistence";
import { rmDefinitionSearch } from '@cob/rest-api-wrapper'
import { toEsFieldName } from '@cob/rest-api-wrapper/src/utils/ESHelper';
import HierarchyNode from './HierarchyNode.vue';

export default {
    components: { HierarchyNode },
    data: () => ({
        statePersistence: Object, 
        tree: undefined,
        instances: undefined,
        tops: undefined,
        selectedPath: undefined,
        originalTops: [],
        originalTree: {},
    }),
    props: {
        component: Object
    }, 
    computed: {
        options() { return this.component['HierarchyCustomize'][0] },
        displayField() { return this.component['DisplayFieldHierarchy']},
        definitionName() { return this.component["DefinitionNameHierarchy"] },
        parentField() { return toEsFieldName(this.component["ParentFieldName"]) },
        sortField() { return toEsFieldName(this.component["SortFieldName"]) },
        outputVar() { return this.component["OutputVarHierarchy"] },
        filter() { return this.component["FilterHierarchy"] || "*" }, // QueryFilter
        inputVar() { return this.component["InputVarHierarchy"] },
        input() { return this.component.vars[this.inputVar] },
        hierarchyNodeClasses() { return this.options['HierarchyNodeClasses'] + " hierarchy-selected " || "text-red-500 font-bold hierarchy-selected" },
        instanceFieldName() { return this.component["InstanceFieldNameHierarchy"] || undefined },
        dashResults() {
            if(this.component.dash_info.state === "loading") return []
            if(this.component.dash_info.state === "error") return []
            if(typeof(this.component.dash_info.value) == "undefined") {
                return []
            } else {
                return this.component.dash_info.value
            }
        },
        dashResultsInput() {
            if(this.component.dash_info_inputs.state === "loading") return []
            if(this.component.dash_info_inputs.state === "error") return []
            if(typeof(this.component.dash_info_inputs.value) == "undefined") {
                return []
            } else {
                return this.component.dash_info_inputs.value
            }
        },
    },
    async created() {
        const args = await this.createFullTree()
        this.instances = args.instances
        this.originalTops = args.tops
        this.originalTree = args.tree

        await this.updateTree()
        this.statePersistence = new ComponentStatePersistence(this.component.id, this.activateFromPersistentChange)
    },
    beforeDestroy() {
            this.statePersistence.stop()
    },
    watch: {
        async input() {
            if (!this.instances)
                return

            this.selectedPath = undefined
            await this.updateTree()
        },
        async dashResults(newRes, oldRes) {
            if (newRes.length > 0 && (oldRes == undefined || oldRes.length == 0) ) {
                if (this.component.dash_info.state === "ready" || this.component.dash_info.state === "cache") {
                    const args = await this.createFullTree()
                    this.instances = args.instances
                    this.originalTops = args.tops
                    this.originalTree = args.tree

                    await this.updateTree()

                    if(this.statePersistence.content){   
                        this.setOutput(this.statePersistence.content)
                    }
                }
                }
        },
        async dashResultsInput(newRes, oldRes) {
            if (this.input) {
                if (this.component.dash_info.state === "ready" || this.component.dash_info.state === "cache") {
                    const args = await this.sweepTreeTops(this.instances, this.input)
                    this.tree = args.tree
                    this.tops = args.tops
                }

            }
        }
    },
    methods: {
        async updateTree() {
            if (this.input) {
                const args = await this.sweepTreeTops(this.instances, this.input)
                this.tree = args.tree
                this.tops = args.tops
            } else {
                this.tops = this.originalTops
                this.tree = this.originalTree
            }
        },
        parentOf(instances, id) { const inst = instances[id][this.parentField]; return inst ? inst[0] : undefined },
        pathToRoot(instances, id) {
            const path = [parseInt(id)]
            let current = this.parentOf(instances, id)
            while (current) {
                path.unshift(parseInt(current))
                current = this.parentOf(instances, current)
            }
            return path
        },
        clear() { this.$set(this.component.vars, this.outputVar, undefined); this.selectedPath = undefined; this.statePersistence.content = ""},
                
        setOutput(id) {
            this.statePersistence.content = id 
            this.selectedPath = this.pathToRoot(this.instances, id)
            if (this.instanceFieldName && this.instances[id][this.instanceFieldName]) {
                let fieldValue = this.instances[id][this.instanceFieldName]
                this.$set(this.component.vars, this.outputVar, fieldValue === Array ? fieldValue[0] : fieldValue)
            } else {
                this.$set(this.component.vars, this.outputVar, this.instances[id])
            }
        },
        activateFromPersistentChange(newID) {
            if(newID && this.dashResults.length > 0)
                this.setOutput(newID) 
        },
        async createFullTree() {
            const results = this.dashResults


            const tops = []
            const tree = {}
            const instances = {}

            const pushOrAdd = (k, v) => k in tree ? tree[k].push(v) : tree[k] = [v]

            for (const instance of results) {

                const parent = instance[this.parentField] 
                if (parent)
                    pushOrAdd(parent, instance.id)
                else
                    tops.push(instance.id)
                instances[instance.id] = instance
            }


            const compareNodesByChildren = (a, b) => {
                const childrenOfA = tree[a] ? tree[a].length : 0
                const childrenOfB = tree[b] ? tree[b].length : 0
                if( childrenOfA == 0 && childrenOfB > 0)
                    return 1 
                if (childrenOfA > 0 && childrenOfB == 0)
                    return -1 
                if ( (childrenOfA == 0 && childrenOfB == 0) || (childrenOfA > 0 && childrenOfB > 0 ))
                    return 0

                return  childrenOfB - childrenOfA
            }

            tops.sort( compareNodesByChildren )
            Object.values(tree).forEach( c =>  c.sort( compareNodesByChildren ) )

            return { tree: tree, tops: tops, instances: instances }
        },
        async sweepTreeTops(instances, input) {
            const results = this.dashResultsInput

            const newTree = {}
            const newTops = new Set()

            const pushOrAdd = (k, v) => k in newTree ? newTree[k].add(v) : newTree[k] = new Set([v])

            for (const instance of results) { 
                const path = this.pathToRoot(instances, instance.id)
                newTops.add(path[0])

                for (let i = 1; i < path.length; i++) {
                    const parent = path[i - 1]
                    pushOrAdd(parent, path[i])
                }

            }

            const tree = {}
            Object.entries(newTree).forEach(([k, v]) => tree[k] = Array.from(v))
            const tops = Array.from(newTops)

            const compareNodesByChildren = (a, b) => {
                const childrenOfA = tree[a] ? tree[a].length : 0
                const childrenOfB = tree[b] ? tree[b].length : 0
                if( childrenOfA == 0 && childrenOfB > 0)
                    return 1 
                if (childrenOfA > 0 && childrenOfB == 0)
                    return -1 
                if ( (childrenOfA == 0 && childrenOfB == 0) || (childrenOfA > 0 && childrenOfB > 0 )) {
                    if (this.sortField) {
                        return this.instances[a][this.sortField][0].localeCompare(this.instances[b][this.sortField][0])
                    } 
                    return 0
                }
                return childrenOfB - childrenOfA
            }

            tops.sort( compareNodesByChildren )
            Object.values(tree).forEach( c =>  c.sort( compareNodesByChildren ) )

            return { tree: tree, tops: tops }
        }

    }


}

</script>