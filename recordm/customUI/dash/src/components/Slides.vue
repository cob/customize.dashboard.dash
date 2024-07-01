
<template>
    <div :class="classes">
        <div class="reveal aspect-video rounded-md" :id="slide_id">
            <div class="slides">
                <section ref="markdownContent" data-markdown>
                    <textarea data-template data-separator="---" data-separator-vertical="^--">
                    {{ this.markdownContent }}
                </textarea>
                </section>
            </div>
        </div>
        <div v-if="reachedEnd" :class="'items-center pt-[1vh]'">
            <Waiting2 v-if="status === 'confirmingVisualization' " />
            <button v-else  v-on:click="confirmContentVisualization"
                :class="[button_classes, { 'cursor-pointer': 'pointer' }]">
                Mark as Seen
            </button>
        </div>
    </div>
</template>

<script>
import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import axios from 'axios';
import Waiting2 from './shared/Waiting2.vue';
const concurrent_dir = "/integrationm/concurrent/"
const loading_message = "### Loading Content"

export default {
    props: {
        component: Object,
        refreshFlag: Number
    },
    data: () => ({
        reachedEnd: false,
        myDeck: undefined,
        status: "loading_component",
    }),
    computed: {
        options() { return this.component['SlidesCustomize'][0]; },
        classes() { return this.options['SlidesClasses'] || ""; },
        button_classes() {
            return `transition ease-in-out duration-300 
            rounded-md border border-green-600 border-2 border-gray-600 
            shadow-sm transform hover:translate-x-0.5 p-2 bg-emerald-300 hover:bg-emerald-500`;
        },
        // To use a single direct content
        markdownContent: {
            get() {
                return this.component["Content"] || loading_message;
            },
            set(newValue) {
                this.component['Content'] = newValue;
            }
        },
        // Used for multiple presentations compatibility in same page if necessary
        slide_id() { return "slidesId-" + Date.now().toString() + (Math.random() + 1).toString(36).substring(7); },
        concurrentScript() { return this.component["SlidesCustomize"][0]["ConcurrentScript"]; },
        concurrentArgs() { return this.component['SlidesCustomize'][0]['Arg'] || {}; }
    },
    methods: {        
        destroyReveal() {
            try {
                if (this.myDeck) {
                    this.myDeck.destroy();
                }
            } catch(e) {
                this.myDeck = undefined
            }
        },  
        closeModal() {
            this.$emit('show-modal', undefined);
        },
        callConcurrentScript() {
            this.status = "confirmingVisualization";
            let args = {};
            args['myArguments'] = this.concurrentArgs.map(myArg => {
                return myArg['Arg'];
            });
            axios.post(concurrent_dir + this.concurrentScript, args).then(res => {
                this.markdownContent = this.loading_message;
                setTimeout(() => {
                    this.$emit('refresh');
                    this.closeModal();
                }, 1500);
            }).catch(e => {
                throw (e);
            });
        },
        prepareReveal() {
            this.destroyReveal()
            // Reveal does DOM manipulation, so we need to "recreate" the original
            // DOM structure so that Reveal can find it, and re-parse and create
            // the presentation with the actual markdown content
            const markdownContainer = document.getElementById(this.slide_id);
            markdownContainer.innerHTML = `<div class="slides">
                <section ref="markdownContent" data-markdown>
                    <textarea data-template data-separator="---" data-separator-vertical="^--">
                        ${this.markdownContent}
                    </textarea>
                </section>`;
            let q_selector = "#" + this.slide_id;
            this.myDeck = new Reveal(document.querySelector(q_selector), {
                plugins: [Markdown],
            });
            // sanity check
            if (this.concurrentScript && this.concurrentScript !== null && this.concurrentScript.trim() !== "") {
                this.myDeck.on('slidetransitionend', event => {
                    if (this.myDeck.getProgress() == 1 && !this.reachedEnd) {
                        this.reachedEnd = true;
                    }
                });
            }
            this.myDeck.initialize({
                embedded: true,
                slideNumber: 'h/v',
                keyboardCondition: 'focused'
            });
        },
        // Confirm content visualization
        confirmContentVisualization() {
            this.callConcurrentScript()
        },
    },
    watch: {
        markdownContent(newContent, oldContent) {
            if (oldContent != newContent && newContent.trim() != "" && newContent != loading_message) {
                this.prepareReveal();
                this.status = "loaded";
                this.reachedEnd = false;
            }
        },
        refreshFlag() {
            this.prepareReveal();
            this.status = "loaded";
            this.reachedEnd = false;
        }
    },
    mounted() {
        this.prepareReveal();
    },
    unmount() {
        this.destroyReveal()
    },
    components: { Waiting2 }
}
</script>

<style>
@import url('~reveal.js/dist/reveal.css');
@import url('~reveal.js/dist/theme/moon.css');

.slide-number {
    z-index: 2;
}

.controls {
    z-index: 2;
}
</style>

