<template>
    <div>
        <template v-for="top of tops">
            <HierarchyNode 
                :selectedPath="selectedPath"
                :setOutput="setOutput"
            :instance="instances[top]"
                :contentField="contentField"
                :tree="tree"
                :instances="instances" />
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
        tree: {},
        instances: {},
        tops: [],
        selectedPath : undefined,
    }),
    props: {
        component: Object
    }, computed: {
        definitionName() { return this.component["DefinitionNameHierarchy"] },
        parentField() { return toEsFieldName(this.component["ParentFieldName"]) },
        outputVar() { return this.component["OutputVarHierarchy"] },
        contentField() { return toEsFieldName(this.component["ContentFieldHierarchy"]) },
        filter() { return this.component["FilterHierarchy"] || "*" }, // QueryFilter
        inputVar() { return }
    },
    async created() {
        const results = await rmDefinitionSearch(this.definitionName, this.filter, 0, 10)

        const pushOrAdd = (k, v) => k in this.tree ? this.tree[k].push(v) : this.tree[k] = [v]

        for (const instance of results.hits.hits) {
            const parent = instance._source[this.parentField]
            if (parent)
                pushOrAdd(parent, instance._id)
            else
                this.tops.push(instance._id)
            this.instances[instance._id] = instance
        }
    },
    methods: {
        parentOf(id) { const inst =  this.instances[id]._source[this.parentField]; return inst ? inst[0]: undefined },
        setOutput( output, id) {
            
            
            const path = [id]
            let current = this.parentOf(id)
            while(current) {
                path.unshift(current)
                current = this.parentOf(current)
            }
            
            this.selectedPath = path


            this.$set(this.component.vars, this.outputVar, output)
        }
    }
}

</script>