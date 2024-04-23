<template>
    <div>
        <button class="float-right text-[10px] uppercase text-slate-400 hover:text-slate-500 border-slate-200  hover:border-slate-300 hover:shadow-none  py-0 px-1 rounded-sm" @click="clear" >
            Limpar
        </button> <br/>
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
import { rmDefinitionSearch } from '@cob/rest-api-wrapper'
import { toEsFieldName } from '@cob/rest-api-wrapper/src/utils/ESHelper';
import HierarchyNode from './HierarchyNode.vue';

export default {
    components: { HierarchyNode },
    data: () => ({
        tree: undefined,
        instances: undefined,
        tops: undefined,
        selectedPath: undefined,
        originalTops: [],
        originalTree: {}
    }),
    props: {
        component: Object
    }, computed: {
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
        instanceFieldName() { return this.component["InstanceFieldNameHierarchy"] || undefined }
    },
    async created() {
        const args = await this.createFullTree()
        this.instances = args.instances
        this.originalTops = args.tops
        this.originalTree = args.tree

        await this.updateTree()
    },
    watch: {
        async input() {
            if (!this.instances)
                return

            this.selectedPath = undefined
            this.updateTree()
        },
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
        parentOf(instances, id) { const inst = instances[id]._source[this.parentField]; return inst ? inst[0] : undefined },
        pathToRoot(instances, id) {
            const path = [id]
            let current = this.parentOf(instances, id)
            while (current) {
                path.unshift(current)
                current = this.parentOf(instances, current)
            }
            return path
        },
        clear() { this.$set(this.component.vars, this.outputVar, undefined); this.selectedPath = undefined},
                
        setOutput(id) {
            this.selectedPath = this.pathToRoot(this.instances, id)
            if (this.instanceFieldName && this.instances[id]._source[this.instanceFieldName]) {
                let fieldValue = this.instances[id]._source[this.instanceFieldName]
                this.$set(this.component.vars, this.outputVar, fieldValue === Array ? fieldValue[0] : fieldValue)
            } else {
                this.$set(this.component.vars, this.outputVar, this.instances[id]._source)
            }

        },
        async createFullTree() {
            const results = await rmDefinitionSearch(this.definitionName, this.filter, 0, 1000,
                this.sortField ? this.sortField : "", "true")


            const tops = []
            const tree = {}
            const instances = {}

            const pushOrAdd = (k, v) => k in tree ? tree[k].push(v) : tree[k] = [v]

            for (const instance of results.hits.hits) {

                const parent = instance._source[this.parentField]
                if (parent)
                    pushOrAdd(parent, instance._id)
                else
                    tops.push(instance._id)
                instances[instance._id] = instance
            }

            return { tree: tree, tops: tops, instances: instances }
        },
        async sweepTreeTops(instances, input) {
            const results = await rmDefinitionSearch(this.definitionName, this.filter + " " + input, 0, 1000,
                this.sortField ? this.sortField : "", "true")

            const newTree = {}
            const newTops = new Set()

            const pushOrAdd = (k, v) => k in newTree ? newTree[k].add(v) : newTree[k] = new Set([v])

            for (const instance of results.hits.hits) {
                const path = this.pathToRoot(instances, instance._id)
                newTops.add(path[0])

                for (let i = 1; i < path.length; i++) {
                    const parent = path[i - 1]
                    pushOrAdd(parent, path[i])
                }

            }

            const tree = {}
            Object.entries(newTree).forEach(([k, v]) => tree[k] = Array.from(v))
            const tops = Array.from(newTops)


            return { tree: tree, tops: tops }
        }

    }


}

</script>