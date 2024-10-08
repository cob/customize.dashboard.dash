<template>
    <div>
        <div class="flex flex-row justify-start cursor-pointer items-start">
            <span v-if="instance && tree[instance.id]"  @click="toggle">
                <FolderClosed  v-if="collapsed && !isSelectedParent" />
                <FolderOpen v-else />
            </span>
            <span :class="iconClasses"  v-else/>
            <span v-if="instance && instances[instance.id]" class="flex-grow leading-6"  @click="updateVar" > 
                <span :id="instance.id" :class="computedClasses">{{ title }}</span>
            </span>
        </div>
        <div  v-if="instance" :class="{ hidden: collapsed && !isSelectedParent }" class="ml-2">
            <template v-for="(child, i) in tree[instance.id]" >
                <HierarchyNode 
                    :displayField="displayField"
                    :selectedPath="childrenSelectedPath"
                    :setOutput="setOutput"
                    :instance="instances[child]"
                    :tree="tree"
                    :instances="instances"
                    :nodeClasses="nodeClasses"
                    :rowClasses="rowClasses"
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
           const labelField =  toEsFieldName(this.displayField ? this.displayField : this.instance._definitionInfo.instanceLabel[0].name)
            return this.instance[labelField][0]
        },
        childrenSelectedPath() { return this.selectedPath ? this.selectedPath.slice(1) : this.selectedPath  },
        isSelected() { return this.selectedPath && this.selectedPath.length == 1 && this.selectedPath[0] == this.instance.id },
        isSelectedParent() { return !this.isSelected && this.selectedPath && this.selectedPath.includes(this.instance.id) },
        computedClasses() { //compute classes according to computed state (isSelected, etc)
            let baseClasses = this.rowClasses.split(' ') 
            baseClasses = [...baseClasses, "cursor-pointer","text-stone-600"]
            if(this.isSelected) {
                return this.nodeClasses.split(' ') 
            }
            return [...baseClasses]
        },   
        iconClasses() { 
            const baseClasses = ["fa-circle", "ml-[6px]", "pr-2", "mt-2", "text-[9px]" ]
            const selectedClass = this.isSelected ? [...this.nodeClasses.split(' '), "fa-solid"] : ["fa-regular"]
            return [...baseClasses, selectedClass]
        }
    },    
    data: () => ({
        collapsed: true
    }),
    watch: {
        isSelectedParent(newV, oldV) {
            if(!newV && oldV && !this.isSelected)
                this.collapsed = false 
        }
    },
    props: {
        selectedPath : Array,
        setOutput: Function,
        instance: Object,
        tree: Object,
        instances: Object,
        nodeClasses: String,
        rowClasses: String,
        displayField: String
    },
    methods: {
        computeClassesForChildren(child) {
            const baseClasses = ["pl-1","border-l-2"]
            const selectedClasses =  ['border-slate-300']
            return [...baseClasses, ...selectedClasses]
        },
        toggle() {
            this.collapsed = !this.collapsed
        },
        updateVar() {
            if(this.isSelected) 
                this.toggle()
            else 
                this.collapsed = false
            this.setOutput(this.instance.id)
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
