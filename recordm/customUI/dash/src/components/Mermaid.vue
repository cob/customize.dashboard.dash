<template>
    <div v-if="loaded" ref="mermaid">
    </div>
    <div v-else class="flex justify-center items-center w-full h-full">
        <Waiting2/>
    </div>
</template>

<script>
import Waiting2 from './shared/Waiting2.vue';
import { rmGetInstance } from '@cob/rest-api-wrapper';

export default {
    props: { component: Object },
    data: () => ({
        fld: String,
        def: String,
        loaded: false,
    }),
    computed: {
        bprocess()          { return this.component['Process']; },
        options()           { return this.component['MermaidCustomize'][0] },
        linkClasses()       { return this.options['LinkClasses'] || "" },
        mermaidClasses()    { return "text-transparent " + (this.options['DiagramClasses'] || "") },
    },
    watch: {
        loaded :  function(val) {
            if(val) 
                this.$nextTick( () => {
                    const lics = this.linkClasses.split(' ')
                    const mcs = this.mermaidClasses.split(' ')
                    embedMermaid(this.bprocess, this.def, this.fld, $(this.$refs.mermaid), undefined, lics, mcs)})
        }
    },
    created() {
        rmGetInstance(this.bprocess).then(resp => {
            this.loaded = true;
            
            this.def = resp.fields[0].fields.find( f => f.fieldDefinition.name == "Specific Data").value
            this.fld = resp.fields[0].fields.find( f => f.fieldDefinition.name == "State Field").value            
        });
    },
    components: { Waiting2 }
} 
</script>