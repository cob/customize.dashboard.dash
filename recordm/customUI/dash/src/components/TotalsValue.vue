<template>
    <a v-if="state" :href="link" :class="classes" >
        <Attention :attentionInfo="attention" :classes="attentionClasses" />
        <span v-html="value" /><span class="" v-html="unit"/>
    </a>
</template>

<script>
    import Attention from './Attention.vue'
    const specialClasses = {
        "Default":   " inline-block m-1 "                                         // para poder conter internamente o Attention sem ser noutra linha
                    +" whitespace-nowrap "                                        // Para não partir o texto + attention
                    +" font-mono font-semibold "                   // Estilo default para o texto
                    +" px-2 py-1 "                                                // Espaçamento horizontal e vertical
                    +" border rounded-md "                                        // Border cinza arrendondada
                    +" ring-sky-600 ring-offset-0 hover:ring-1 ring-stone-300 ",  // Estilo para hover

        "Info":            " border-sky-500   bg-sky-50 ",
        "Success":         " border-lime-400  bg-lime-50  ",
        "Warning":         " border-amber-400 bg-amber-50 ",
        "Important":       " border-rose-300  bg-rose-50 ",
        "Gray":            " border-stone-300 bg-stone-50 ",

        "StrongInfo":      " border-stone-300 bg-cyan-600 ",
        "StrongSuccess":   " border-stone-300  bg-lime-600  ",
        "StrongWarning":   " border-stone-300 bg-amber-500 ",
        "StrongImportant": " border-stone-300  bg-rose-600 ",
        "StrongGray":      " border-stone-300 bg-stone-600 ",

        "S_zero":          " !border-stone-200 !bg-stone-50/70 !text-stone-500/70 ",
        "S_loading":       " border-amber-400 bg-amber-50 !text-stone-500  ",  // Igual a Warning
        "S_error":         " !border-rose-300 !bg-rose-50 !text-stone-500  "    // Igual a Important
    }

    export default {
        components: { Attention },
        props: { valueData: Object, clicker : Function, hasVars : Boolean, customLink : String},
        computed: {
            options()          { return this.valueData['ValueCustomize'][0] },
            view()             { return this.options['View'] },
            attention()        { return this.options['AttentionInfo'] },
            attentionClasses() { return this.options['ValueAttentionClasses'] },
            unit()             { return this.options['Unit'] },
            state()            { return this.valueData.dash_info && this.valueData.dash_info.state || "" },
            updating()         { return this.state === "updating" || this.state === "loading" },
            link()             { 
                if (this.hasVars) { return false } 
                if (this.customLink) { return this.customLink }
                return this.valueData.dash_info.href ? this.valueData.dash_info.href + (this.view ? "&av=" + this.view : "") : "#"
            },
            value() {
                if(this.valueData.dash_info.state === "loading") return "L"
                if(this.valueData.dash_info.state === "error") return "E"
                if(typeof(this.valueData.dash_info.value) == "undefined") {
                    return "L"
                } else if(isNaN(this.valueData.dash_info.value)) {
                    return this.valueData.dash_info.value
                } else {
                    return new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(this.valueData.dash_info.value) 
                }
            },
            classes()          { 
                let classes = (this.options['ValueClasses'] || " Default Info text-sm text-stone-800 ")

                if(this.valueData.dash_info && this.valueData.dash_info.value==0) {
                    classes += " S_zero "
                }
                if (this.valueData.dash_info.state == "error") {
                    classes += " S_error"
                } else if(this.updating) {
                    classes += " spinning "
                    if(this.value == "L") {
                        classes += " !border-amber-400 !bg-amber-50 !text-stone-600" //Warning with important
                    }
                } 
                
                if (this.hasVars) {
                    classes += " cursor-pointer"
                } 

                return classes.split(/\s/).map(c => specialClasses[c] || c ).join(" ") 
            }
        }
    }
</script>

<style scoped>
    .spinning {
        position: relative;
    }
    .spinning::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border: 2px solid #999D;
        border-radius: 5px;
        animation: clippath 0.4s infinite linear;
    }

    @keyframes clippath {
        0%,
        100% {
            clip-path: inset(0 0 95% 0);
        }
        25% {
            clip-path: inset(0 95% 0 0);
        }
        50% {
            clip-path: inset(95% 0 0 0);
        }
        75% {
            clip-path: inset(0 0 0 95%);
        }
    }
</style>