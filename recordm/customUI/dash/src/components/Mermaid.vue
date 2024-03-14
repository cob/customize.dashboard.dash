<template>
    <div class="h-full w-full">
        <div v-show="rendered" ref="mermaid" class="mermaid-diagram-scaled">
        </div>
        <div v-if="!rendered"  class="flex justify-center items-center w-full h-full">
            <Waiting2/>
        </div>
    </div>
</template>

<script>
import Waiting2 from './shared/Waiting2.vue';
import { rmGetInstance } from '@cob/rest-api-wrapper';

export default {
    props: { component: Object },
    data: () => ({
        rendered: false,
    }),
    computed: {
        bprocess()          { return this.component['Process']; },
        options()           { return this.component['MermaidCustomize'][0] },
        linkClasses()       { return this.options['LinkClasses'] || "" },
        mermaidClasses()    { return "text-transparent " + (this.options['DiagramClasses'] || "") },
    },
    created() {
        rmGetInstance(this.bprocess)
            .then(resp => {
                const def = resp.fields[0].fields.find( f => f.fieldDefinition.name == "Specific Data").value
                const fld = resp.fields[0].fields.find( f => f.fieldDefinition.name == "State Field").value            
                return [ def, fld ]
            })
            .then(([def, fld]) => {
                const lics = this.linkClasses
                const mcs = this.mermaidClasses
                this.$nextTick( () => {
                    embedMermaid(this.bprocess, def, fld, this.$refs.mermaid, {linkClasses : lics, mermaidClasses: mcs})
                    .then( () => this.rendered = true )
                })
            });
    },
    components: { Waiting2 }
} 
</script>