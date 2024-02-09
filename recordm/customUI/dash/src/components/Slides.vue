<!-- testing -->

<template>
    <div class="reveal aspect-video rounded-md" :classes="classes">
        <div class="slides">
            <section data-markdown>
                <textarea data-template 
                data-separator="---" 
                data-separator-vertical="^--">
                    {{ myContent }}
                </textarea>
            </section>
        </div>
    </div>
</template>

<script>
import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';


export default {
    props: {
        component: Object
    },
    computed: {
        options() { return this.component['SlidesCustomize'][0] },
        classes() { return this.options['SlidesClasses'] || "" },
        myContent() { return this.component["Content"] },
    },
    mounted() {
        let deck = new Reveal(
            {
                plugins: [Markdown],
            })

        deck.initialize({
            embedded: true,
            hash: true,
            slideNumber: 'h/v'
        })

        console.log(deck.getPlugins())
    },
    umounted() {
        Reveal.destroy()
    }
}
</script>

<style>
@import url('~reveal.js/dist/reveal.css');
@import url('~reveal.js/dist/theme/dracula.css');
</style>

