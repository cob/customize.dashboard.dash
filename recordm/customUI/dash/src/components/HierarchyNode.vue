<template>
    <div>
        <div class="flex flex-row justify-start ">
            <span v-if="tree[instance._id]" @click="toggle">
                <FolderClosed class="cursor-pointer" v-if="collapsed" />
                <FolderOpen class="cursor-pointer" v-else />
            </span>
            <span class="pl-5" v-else @click="toggle">
            </span>
            <span class="flex-grow" > 
                <span class="cursor-pointer" :id="instance._id" :class="computedClasses" @click="updateVar">{{ title }}</span>
            </span>
        </div>
        <div :class="{ hidden: collapsed }">
            <template v-for="child of tree[instance._id]">
                <HierarchyNode 
                    :selectedPath="childrenSelectedPath"
                    :setOutput="setOutput"
                    :instance="instances[child]"
                    :tree="tree"
                    :instances="instances"
                    :nodeClasses="nodeClasses"
                    :class="computeClassesForChildren(child)" />
            </template>
        </div>
    </div>

</template>


<script>
import FolderClosed from "./shared/FolderClosed.vue";
import {toEsFieldName} from '@cob/rest-api-wrapper/src/utils/ESHelper';
import FolderOpen from "./shared/FolderOpen.vue";

export default {
    name: 'HierarchyNode',
    components: { FolderClosed, FolderOpen },
    computed: {
        title() {
            const labelField = toEsFieldName(this.instance._source._definitionInfo.instanceLabel[0].name )
            return this.instance._source[labelField][0]
        },
        childrenSelectedPath() { return this.selectedPath ? this.selectedPath.slice(1) : this.selectedPath  },
        isSelected() { return this.selectedPath && this.selectedPath.length == 1 && this.selectedPath[0] == this.instance._id},
        isSelectedParent() { return !this.isSelected && this.selectedPath && this.selectedPath.includes(this.instance._id) },
        computedClasses() { //compute classes according to computed state (isSelected, etc)
            const baseClasses = ["cursor-pointer"]
            const selectedClasses = this.isSelected ? this.nodeClasses.split(' ') : ['text-slate-600']
            const selectedParentClasses = this.isSelectedParent ? ["font-bold"] : []
            return [...baseClasses, ...selectedClasses, ...selectedParentClasses]
        },        
        
    },
    data: () => ({
        collapsed: true
    }),
    props: {
        selectedPath : Array,
        setOutput: Function,
        instance: Object,
        tree: Object,
        instances: Object,
        nodeClasses: String
    },
    methods: {
        computeClassesForChildren(child) {
            const baseClasses = ["pl-4","border-l-2"]
            const selectedClasses = this.childIsSelected(child) ? ['border-slate-700','border-l-2'] : ['border-slate-300']
            return [...baseClasses, ...selectedClasses]
        },
        toggle() {
            this.collapsed = !this.collapsed
        },
        updateVar() {
            this.setOutput(this.instance._id)
        },
        childIsSelected(id) {
            return this.childrenSelectedPath && this.childrenSelectedPath.length == 1 && this.childrenSelectedPath[0] == id
        },
        childHasSelectedChild(id){
            return this.childrenSelectedPath && this.childrenSelectedPath.length > 1 && this.childrenSelectedPath[0] == id 
        }
    }

}

</script>