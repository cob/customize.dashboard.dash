<template>
    <div class="flex h-fit pb-0 justify-center items-center">
        <textarea :class="classes"
            v-model="inputContent"
            ref="textarea"
            @keydown.enter.exact.prevent
            @keyup.enter.exact="activateFromInputChange"
            @focus="resize"
            @keyup="resize"
            :placeholder="placeholder"
        ></textarea>
        <button v-if="showButton" @click="activateFromInputChange" type="submit" class="max-h-11 p-2 ml-2 text-sm font-medium text-white bg-blue-700 rounded-lg border border-blue-700 hover:bg-blue-800">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </button>
    </div>
</template>

<script>
    import ComponentStatePersistence from "@/model/ComponentStatePersistence";

    export default {
        props: {
          component: Object
        },
        data: () => ({
            inputContent: "",
            activeContent: "",
            statePersistence: Object
        }),
        created() {
            this.statePersistence = new ComponentStatePersistence(this.component.id, this.activateFromPersistenceChange)
        },
        beforeDestroy() {
            this.statePersistence.stop()
        },
        computed: {
            options()         { return this.component['FilterCustomize'][0] },
            outputVar()       { return this.component['OutputVarFilter'] || "" },
            placeholder()     { return this.options['Placeholder']       || "Pesquisar ..." },
            selectedOptions() { return (this.options['FilterCustomize'] || "").split("\u0000") },
            showButton()      { return this.selectedOptions.indexOf("noButton") === -1 },
            classes()         { return this.options['FilterClasses']     || "w-full max-w-xs resize-none min-h-min h-min border border-slate-300 rounded-md py-2 px-2 outline-slate-300 leading-5" },
            esEscape()        { return this.selectedOptions.indexOf("EscapeSpecialChars") !== -1 },
        },
        watch: {
            activeContent(newActiveContent) {
              let cleanContent = newActiveContent.replace(/\n/g,' ').trim()

              if (this.esEscape) {
                cleanContent = cleanContent
                    .replace(/[\*\+\-=~><\"\?^\${}\(\)\:\!\/[\]\\\s]/g, '\\$&') // replace single character special characters
                    .replace(/\|\|/g, '\\||') // replace ||
                    .replace(/\&\&/g, '\\&&') // replace &&
                    .replace(/AND/g, '\\A\\N\\D') // replace AND
                    .replace(/OR/g, '\\O\\R') // replace OR
                    .replace(/NOT/g, '\\N\\O\\T') // replace NOT
              }

              let esFilter = cleanContent ? cleanContent : ""
              this.$set(this.component.vars, this.outputVar, esFilter)
            },
        },
        methods: {
            activateFromInputChange() {
                this.activeContent = this.statePersistence.content = this.inputContent || ""
            },
            activateFromPersistenceChange(newContent) {
                this.activeContent = this.inputContent = newContent || ""
                setTimeout(() => this.resize(),10) // dá tempo ao input box ter o conte
            },
            resize() {
                const { textarea } = this.$refs;
                if(textarea && this.inputContent && ( textarea.textLength >= textarea.cols || this.inputContent.split("\n").length > 1) ) {
                    textarea.style.height = "auto";
                    textarea.style.height = (textarea.scrollHeight + 2) + 'px'; // Os 14px são do padding acrescentado
                } else if(textarea) {
                    textarea.style.height = "40px";
                }
            }
        }
    }
</script>