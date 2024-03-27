<template>
    <div>
        <div class="flex flex-row justify-start ">
            <span class="flex-grow" > 
                <span class="cursor-pointer" :id="instance._id" :class="{ 'text-red-500 font-bold hierarchy-selected' : isSelected, 'text-slate-600' : !isSelected, 'font-bold' : isSelectedParent}" @click="updateVar">{{ title }}</span>
            </span>
            <span v-if="tree[instance._id]" @click="toggle">
                <FolderClosed class="cursor-pointer" v-if="collapsed" />
                <FolderOpen class="cursor-pointer" v-else />
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
                    class="pl-5  border-l"
                    :class="{
                        'border-slate-300' : !childIsSelected(child),
                        'border-red-400 border-l-2' : childIsSelected(child) }" />
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
        isSelectedParent() { return !this.isSelected && this.selectedPath && this.selectedPath.includes(this.instance._id) } 
    },
    data: () => ({
        collapsed: true
    }),
    props: {
        selectedPath : Array,
        setOutput: Function,
        instance: Object,
        tree: Object,
        instances: Object
    },
    methods: {
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