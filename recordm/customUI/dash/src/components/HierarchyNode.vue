<template>
    <div>
        <div class="flex flex-row justify-start cursor-pointer items-start" @click="updateVar" >
            <span v-if="tree[instance._id]">
                <FolderClosed  v-if="collapsed && !isSelectedParent" />
                <FolderOpen v-else />
            </span>
            <span :class="iconClasses"  v-else/>
            <span class="flex-grow leading-6" > 
                <span :id="instance._id" :class="computedClasses">{{ title }}</span>
            </span>
        </div>
        <div :class="{ hidden: collapsed }" class="ml-2">
            <template v-for="(child, i) in tree[instance._id]" >
                <HierarchyNode 
                    :displayField="displayField"
                    :selectedPath="childrenSelectedPath"
                    :setOutput="setOutput"
                    :instance="instances[child]"
                    :tree="tree"
                    :instances="instances"
                    :nodeClasses="nodeClasses"
                    :class="computeClassesForChildren(child)" 
                    :key="i"
                    />
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
           const labelField =  toEsFieldName(this.displayField ? this.displayField : this.instance._source._definitionInfo.instanceLabel[0].name)
            return this.instance._source[labelField][0]
        },
        childrenSelectedPath() { return this.selectedPath ? this.selectedPath.slice(1) : this.selectedPath  },
        isSelected() { return this.selectedPath && this.selectedPath.length == 1 && this.selectedPath[0] == this.instance._id},
        isSelectedParent() { return !this.isSelected && this.selectedPath && this.selectedPath.includes(this.instance._id) },
        computedClasses() { //compute classes according to computed state (isSelected, etc)
            const baseClasses = ["cursor-pointer"]
            const selectedClasses = this.isSelected ? this.nodeClasses.split(' ') : ['text-slate-600']
            return [...baseClasses, ...selectedClasses]
        },   
        iconClasses() { 
            const baseClasses = ["fa-circle", "ml-[6px]", "pr-2", "text-[9px]" ]
            const selectedClass = this.isSelected ? [...this.nodeClasses.split(' '), "fa-solid"] : ["fa-regular"]
            return [...baseClasses, selectedClass]
        }    
        
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
        nodeClasses: String,
        displayField: String
    },
    methods: {
        computeClassesForChildren(child) {
            const baseClasses = ["pl-1","border-l-2"]
            // const selectedClasses = this.childIsSelected(child) ? ['border-slate-700'] : ['border-slate-300']
            const selectedClasses =  ['border-slate-300']
            return [...baseClasses, ...selectedClasses]
        },
        toggle() {
            this.collapsed = !this.collapsed
        },
        updateVar() {
            this.toggle()
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