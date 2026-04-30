<template>
    <li role="treeitem"
        :aria-selected="isSelected"
        :aria-expanded="tree[instance.id] ? !collapsed : undefined"
        class="list-none">
        <div class="flex flex-row justify-start cursor-pointer items-start rounded px-1 -mx-1 transition-colors"
             :class="hasHiddenSelection ? 'bg-slate-100 hover:bg-slate-200' : 'hover:bg-slate-50'">
            <span v-if="instance && tree[instance.id]"
                  class="relative flex items-center justify-center w-6 h-6 shrink-0 transition-colors"
                  :class="folderIconWrapperClasses"
                  tabindex="0"
                  @click="toggle"
                  @keydown.enter.prevent="toggle"
                  @keydown.space.prevent="toggle">
                <FolderClosed v-if="collapsed" />
                <FolderOpen v-else />
                <span v-if="hasHiddenSelection"
                      class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-current" />
            </span>
            <span :class="iconClasses" v-else />
            <span v-if="instance && instances[instance.id]"
                  class="flex-grow leading-6"
                  tabindex="0"
                  @click="updateVar"
                  @keydown.enter.prevent="updateVar">
                <span :id="instance.id" :class="computedClasses">{{ title }}</span>
                <span v-if="selectedNodeTitle"
                      class="ml-1.5 text-xs font-normal text-slate-400">› {{ selectedNodeTitle }}</span>
            </span>
        </div>
        <template v-if="instance && tree[instance.id]">
            <transition name="tree-expand">
                <ul v-show="!collapsed"
                    role="group"
                    class="ml-2 list-none p-0 m-0">
                    <HierarchyNode
                        v-for="child in tree[instance.id]"
                        :key="child"
                        :displayField="displayField"
                        :selectedPath="childrenSelectedPath"
                        :instance="instances[child]"
                        :tree="tree"
                        :instances="instances"
                        :nodeClasses="nodeClasses"
                        :rowClasses="rowClasses"
                        :expandSignal="expandSignal"
                        :collapseSignal="collapseSignal"
                        :class="childConnectorClasses"
                        @select="$emit('select', $event)"
                    />
                </ul>
            </transition>
        </template>
    </li>
</template>

<script>
import FolderClosed from "./shared/FolderClosed.vue";
import { toEsFieldName } from '@cob/rest-api-wrapper/src/utils/ESHelper';
import FolderOpen from "./shared/FolderOpen.vue";

export default {
    name: 'HierarchyNode',
    components: { FolderClosed, FolderOpen },
    props: {
        selectedPath: Array,
        instance: Object,
        tree: Object,
        instances: Object,
        nodeClasses: String,
        rowClasses: String,
        displayField: String,
        expandSignal: Number,
        collapseSignal: Number,
    },
    data: () => ({
        collapsed: true
    }),
    watch: {
        expandSignal() { this.collapsed = false },
        collapseSignal() { this.collapsed = true },
    },
    computed: {
        title() {
            return this.titleOf(this.instance)
        },
        selectedNodeTitle() {
            if (!this.hasHiddenSelection) return null
            const selectedId = this.selectedPath[this.selectedPath.length - 1]
            const inst = this.instances[selectedId]
            return inst ? this.titleOf(inst) : null
        },
        childrenSelectedPath() { return this.selectedPath ? this.selectedPath.slice(1) : this.selectedPath },
        isSelected() {
            return this.selectedPath &&
                   this.selectedPath.length === 1 &&
                   this.selectedPath[0] === String(this.instance.id)
        },
        isSelectedParent() {
            return !this.isSelected && this.selectedPath && this.selectedPath.includes(String(this.instance.id))
        },
        hasHiddenSelection() {
            return this.collapsed && this.isSelectedParent
        },
        folderIconWrapperClasses() {
            if (this.isSelectedParent) {
                const colourClass = this.nodeClasses.split(' ').filter(Boolean).find(c => c.startsWith('text-'))
                return [colourClass || 'text-slate-600', 'hover:opacity-80']
            }
            return ['text-slate-400', 'hover:text-slate-600']
        },
        computedClasses() {
            const base = [...this.rowClasses.split(' ').filter(Boolean), "cursor-pointer"]
            const hasBranch = !!this.tree[this.instance.id]
            if (this.isSelected) return this.nodeClasses.split(' ').filter(Boolean)
            return hasBranch ? [...base, "font-medium"] : [...base, "font-normal"]
        },
        iconClasses() {
            const baseClasses = ["fa-circle", "ml-1.5", "pr-2", "mt-1.5", "text-xs"]
            const selectedClass = this.isSelected
                ? [...this.nodeClasses.split(' ').filter(Boolean), "fa-solid"]
                : ["fa-regular"]
            return [...baseClasses, ...selectedClass]
        },
        childConnectorClasses() {
            return ["pl-1", "border-l-2", "border-slate-300"]
        },
    },
    methods: {
        titleOf(inst) {
            const labelField = toEsFieldName(this.displayField ? this.displayField : inst._definitionInfo.instanceLabel[0].name)
            return inst[labelField][0]
        },
        toggle() {
            this.collapsed = !this.collapsed
        },
        updateVar() {
            if (!this.isSelected)
                this.collapsed = false
            this.$emit('select', this.instance.id)
        },
    }
}
</script>

<style scoped>
.tree-expand-enter-active,
.tree-expand-leave-active {
    transition: opacity 0.12s ease;
}
.tree-expand-enter,
.tree-expand-leave-to {
    opacity: 0;
}
</style>
