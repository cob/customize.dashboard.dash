<template>
    <a v-if="state" :href="link" :class="classes">

        <Attention :attentionInfo="attention" :classes="attentionClasses" />

        <span v-html="value"/><span class="" >{{unit}}</span>

        <svg v-if="updating" class="absolute animate-spin -top-1 -right-1 h-2 w-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
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

        "S_loading":       " border-amber-300 bg-amber-50 ",  // Igual a Warning
        "S_error":         " border-rose-300  bg-rose-50  "    // Igual a Important
    }

    export default {
        components: { Attention },
        props: { valueData: Object },
        computed: {
            options()          { return this.valueData['ValueCustomize'][0] },
            view()             { return this.options['View'] },
            attention()        { return this.options['AttentionInfo'] },
            attentionClasses() { return this.options['ValueAttentionClasses'] },
            unit()             { return this.options['Unit'] },
            state()            { return this.valueData.dash_info && this.valueData.dash_info.state || "" },
            updating()         { return this.state === "updating" || this.state === "loading" },
            link()             { return this.valueData.dash_info.href ? this.valueData.dash_info.href + (this.view ? "&av=" + this.view : "") : "#"},
            classes()          { 
                let classes =  (this.options['ValueClasses'] || " Default Info text-sm text-stone-800 ")
                if(["loading","error"].indexOf(this.valueData.dash_info.state) != -1) {
                    classes = classes.replace(/Bg(Dim){0,1}(Red|Orange|Blue|Gray|Green)/," ") 
                    classes = classes.replace(/(Info|Success|Warning|Important|Gray)(Strong){0,1} /," ") 
                    classes += " S_" +this.valueData.dash_info.state
                } else if(this.valueData.dash_info && !isNaN(this.valueData.dash_info.value) && this.valueData.dash_info.value==0) {
                    classes = classes.replace(/(Info|Success|Warning|Important|Gray)/," Gray text-cob-white ") 
                }
                return classes.split(/\s/).map(c => specialClasses[c] || c ).join(" ") 
            },
            value() {
                if(this.valueData.dash_info.state === "loading") return "L"
                if(this.valueData.dash_info.state === "error") return "E"
                debugger
                if(typeof(this.valueData.dash_info.value) == "undefined") {
                    return "L"
                } else if(isNaN(this.valueData.dash_info.value)) {
                    return this.valueData.dash_info.value
                } else {
                    return new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(this.valueData.dash_info.value) 
                }
            }
        }
    }
</script>

<style scoped>
    .text-cob-white {
        color: #78716c;
    }
</style>