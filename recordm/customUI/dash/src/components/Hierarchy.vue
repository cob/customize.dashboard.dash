<template>
    <div class="flex flex-col gap-0.5">
        <div class="flex justify-between items-center mb-1">
            <div class="flex gap-1">
                <button
                    class="text-[10px] uppercase text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 py-0.5 px-2 rounded transition-colors"
                    aria-label="Expand all"
                    @click="expandCount++">
                    Expand all
                </button>
                <button
                    class="text-[10px] uppercase text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 py-0.5 px-2 rounded transition-colors"
                    aria-label="Collapse all"
                    @click="collapseCount++">
                    Collapse all
                </button>
            </div>
            <button
                class="text-[10px] uppercase text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 py-0.5 px-2 rounded transition-colors"
                aria-label="Clear selection"
                @click="clear">
                Clear
            </button>
        </div>
        <ul role="tree" class="list-none p-0 m-0">
            <HierarchyNode
                v-for="top in tops"
                :key="top"
                class="pb-1"
                :selectedPath="selectedPath"
                :instance="instances[top]"
                :tree="tree"
                :instances="instances"
                :nodeClasses="hierarchyNodeClasses"
                :displayField="displayField"
                :rowClasses="hierarchyRowClasses"
                :expandSignal="expandCount"
                :collapseSignal="collapseCount"
                @select="setOutput"
            />
        </ul>
        <div v-if="tops && tops.length === 0"
             class="flex flex-col items-center justify-center py-6 text-slate-400 text-sm gap-2">
            <template v-if="isLoading">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span>Loading…</span>
            </template>
            <template v-else>
                <i class="fa-regular fa-folder-open text-xl"/>
                <span>No results</span>
            </template>
        </div>
    </div>
</template>

<script>
import ComponentStatePersistence from "@/model/ComponentStatePersistence";
import { toEsFieldName } from '@cob/rest-api-wrapper/src/utils/ESHelper';
import HierarchyNode from './HierarchyNode.vue';

export default {
    components: { HierarchyNode },
    data: () => ({
        statePersistence: null,
        tree: undefined,
        instances: undefined,
        tops: undefined,
        selectedPath: undefined,
        originalTops: [],
        originalTree: {},
        rebuilding: false,
        expandCount: 0,
        collapseCount: 0,
        previousHash: "",
    }),
    props: {
        component: Object
    },
    computed: {
        isLoading() { return this.component.dash_info.state !== "cache" && this.component.dash_info.state !== "ready" },
        options() { return this.component['HierarchyCustomize'][0] },
        displayField() { return this.component['DisplayFieldHierarchy'] },
        parentField() { return toEsFieldName(this.component["ParentFieldName"]) },
        sortField() { return toEsFieldName(this.component["SortFieldName"]) },
        outputVar() { return this.component["OutputVarHierarchy"] },
        filter() { return this.component["FilterHierarchy"] || "*" },
        inputVar() { return this.component["InputVarHierarchy"] },
        input() { return this.component.vars[this.inputVar] },
        hierarchyNodeClasses() { return (this.options['HierarchyNodeClasses'] || "text-red-500 font-bold") + " hierarchy-selected" },
        hierarchyRowClasses() { return this.options['HierarchyRowClasses'] || "text-stone-600" },
        instanceFieldName() { return this.component["InstanceFieldNameHierarchy"] || undefined },
        dashResults() {
            if (this.component.dash_info.state === "loading") return []
            if (this.component.dash_info.state === "error") return []
            if (typeof this.component.dash_info.value === "undefined") return []
            return this.component.dash_info.value
        },
        dashResultsInput() {
            if (this.component.dash_info_inputs.state === "loading") return []
            if (this.component.dash_info_inputs.state === "error") return []
            if (typeof this.component.dash_info_inputs.value === "undefined") return []
            return this.component.dash_info_inputs.value
        },
    },
    async created() {
        const args = await this.createFullTree(this.dashResults)
        this.instances = args.instances
        this.originalTops = args.tops
        this.originalTree = args.tree

        await this.updateTree()
        this.statePersistence = new ComponentStatePersistence(this.component.id, this.activateFromPersistentChange)
    },
    beforeDestroy() {
        // created() is async: destruction can happen before statePersistence is assigned
        if (this.statePersistence) this.statePersistence.stop()
    },
    watch: {
        async input() {
            if (!this.instances) return
            this.selectedPath = undefined
            await this.updateTree()
        },
        async dashResults(newRes, oldRes) {
            const newHash = this.hashArray(this.dashResults)
            if ((this.component.dash_info.state === "ready" || this.component.dash_info.state === "cache")
                && newHash != this.previousHash ) {
                this.rebuilding = true
                const args = await this.createFullTree(newRes)
                this.instances = args.instances
                this.originalTops = args.tops
                this.originalTree = args.tree

                await this.updateTree()
                this.previousHash = newHash
                if(this.statePersistence.content){   
                    this.setOutput(this.statePersistence.content)
                }
                this.rebuilding = false
            }
        },
        async dashResultsInput(newRes, oldRes) {
            if (this.rebuilding) return
            if (this.input) {
                if (this.component.dash_info.state === "ready" || this.component.dash_info.state === "cache") {
                    const args = await this.sweepTreeTops(this.instances, this.input)
                    this.tree = args.tree
                    this.tops = args.tops
                } 
            }
        },
    },
    methods: {
        async updateTree() {
            if (this.input) {
                const args = await this.sweepTreeTops(this.instances)
                this.tree = args.tree
                this.tops = args.tops
            } else {
                this.tops = this.originalTops
                this.tree = this.originalTree
            }
        },
        parentOf(instances, id) {
            const inst = instances[String(id)][this.parentField]
            return inst && (String(inst[0]) in instances) ? String(inst[0]) : undefined
        },
        pathToRoot(instances, id) {
            const path = [String(id)]
            const visited = new Set(path)
            let current = this.parentOf(instances, id)
            while (current) {
                if (visited.has(current)) break
                visited.add(current)
                path.unshift(current)
                current = this.parentOf(instances, current)
            }
            return path
        },
        _compareNodes(tree, a, b, useSortField) {
            const childrenOfA = tree[a] ? tree[a].length : 0
            const childrenOfB = tree[b] ? tree[b].length : 0
            
            if( childrenOfA == 0 && childrenOfB > 0)
                return 1 
            if (childrenOfA > 0 && childrenOfB == 0)
                return -1 
            if ( (childrenOfA == 0 && childrenOfB == 0) || (childrenOfA > 0 && childrenOfB > 0 ))
                return 0

            return  childrenOfB - childrenOfA
        },
        clear() {
            this.$set(this.component.vars, this.outputVar, undefined)
            this.selectedPath = undefined
            if (this.statePersistence) this.statePersistence.content = ""
        },
        setOutput(id) {
            if (this.statePersistence) this.statePersistence.content = id
            this.selectedPath = this.pathToRoot(this.instances, id)
            if (this.instanceFieldName && this.instances[id][this.instanceFieldName]) {
                const fieldValue = this.instances[id][this.instanceFieldName]
                this.$set(this.component.vars, this.outputVar, Array.isArray(fieldValue) ? fieldValue[0] : fieldValue)
            } else {
                this.$set(this.component.vars, this.outputVar, this.instances[id])
            }
        },
        activateFromPersistentChange(newID) {
            if (newID && this.dashResults.length > 0)
                this.setOutput(newID)
        },
        async createFullTree(results) {
            const tops = []
            const tree = {}
            const instances = {}

            const pushOrAdd = (k, v) => k in tree ? tree[k].push(v) : tree[k] = [v]
            const resultIds2 = new Set(this.dashResults.map(r => String(r.id))) 
            for (const instance of results) {
                const parent = instance[this.parentField]
                if (parent && resultIds2.has(String(parent[0])))
                    pushOrAdd(String(parent[0]), String(instance.id))
                else
                    tops.push(String(instance.id))
                instances[String(instance.id)] = instance
            }

            const compare = (a, b) => this._compareNodes(tree, a, b)
            tops.sort(compare)
            Object.values(tree).forEach(c => c.sort(compare))

            return { tree, tops, instances }
        },
        async sweepTreeTops(instances) {
            const results = this.dashResultsInput
            const newTree = {}
            const newTops = new Set()

            const pushOrAdd = (k, v) => k in newTree ? newTree[k].add(v) : newTree[k] = new Set([v])

            for (const instance of results) {
                const path = this.pathToRoot(instances, instance.id)
                newTops.add(path[0])
                for (let i = 1; i < path.length; i++) {
                    pushOrAdd(path[i - 1], path[i])
                }
            }

            const tree = {}
            Object.entries(newTree).forEach(([k, v]) => tree[k] = Array.from(v))
            const tops = Array.from(newTops)

            const compare = (a, b) => this._compareNodes(tree, a, b)
            tops.sort(compare)
            Object.values(tree).forEach(c => c.sort(compare))
            return { tree, tops }
        },
    hashArray(arr) {
        let h1 = 0xdeadbeef ^ arr.length;
        let h2 = 0x41c6ce57 ^ arr.length;
        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const s = item.id + '|' + item.parent; // fields that matter
            for (let j = 0; j < s.length; j++) {
            const ch = s.charCodeAt(j);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
            }
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
    },
}

}
</script>
