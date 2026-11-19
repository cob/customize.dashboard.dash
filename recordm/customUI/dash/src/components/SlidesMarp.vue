<template>
    <div :class="classes">
        <div ref="deck" class="marp-deck rounded-md" :class="{ 'marp-overview': overview }" tabindex="0"
            @keydown="onKey" @click="focusDeck">
            <div ref="slides" class="marp-slides" v-html="rendered.html"></div>
            <div v-if="!overview && total > 0" class="marp-controls">
                <button :disabled="current === 0" @click.stop="go(current - 1)" aria-label="Slide anterior">&#8249;</button>
                <span class="marp-counter">{{ current + 1 }} / {{ total }}</span>
                <button :disabled="current >= total - 1" @click.stop="go(current + 1)" aria-label="Slide seguinte">&#8250;</button>
            </div>
        </div>
        <div v-if="reachedEnd" :class="'items-center pt-[1vh]'">
            <Waiting2 v-if="status === 'confirmingVisualization'" />
            <button v-else v-on:click="confirmContentVisualization"
                :class="[button_classes, { 'cursor-pointer': 'pointer' }]">
                Mark as Seen
            </button>
        </div>
    </div>
</template>

<script>
// Slides com Marp (https://marp.app) em vez de reveal.js. Mesmo comportamento do componente
// Slides: mostra o markdown como apresentação e, se houver MarpConcurrentScript, ao chegar ao
// último slide mostra "Mark as Seen", que chama esse concurrent com os MarpSlidesArg.
// Teclado (com o deck focado): setas/PageUp/PageDown/espaço navegam, F ecrã inteiro,
// O vista geral (clicar num slide salta para ele), Esc sai da vista geral / ecrã inteiro.
// Temas: os do Marp (default, gaia, uncover) estão sempre disponíveis. Um tema próprio
// (front-matter "theme: <nome>") é lido de recordm/customUI/css/marp/<nome>.css, servido em
// THEMES_URL/<nome>.css, e registado antes de renderizar. Não está nos imports de
// customizations.css: o CSS de um tema Marp estiliza section/h1/table... e estragaria o RecordM.
import { Marp } from '@marp-team/marp-core';
import marpBrowser from '@marp-team/marp-core/browser';
import axios from 'axios';
import Waiting2 from './shared/Waiting2.vue';
const concurrent_dir = "/integrationm/concurrent/"
const loading_message = "# Loading Content"
const THEMES_URL = "/recordm/localresource/css/marp/"
const BUILTIN_THEMES = ["default", "gaia", "uncover"]
const themeCache = {} // nome -> Promise<css | null>, partilhado entre instâncias do componente

// O template do dashboard é compilado com Handlebars, que escapa o valor de {{campo}} como HTML
// (&lt; &quot; &#x60; ...). O Slides (reveal) não sofre porque insere o texto numa <textarea>;
// aqui desfaz-se o escape antes de dar o markdown ao Marp.
function decodeEntities(text) {
    const el = document.createElement('textarea');
    el.innerHTML = text;
    return el.value;
}

function themeName(markdown) {
    const fm = /^\s*---\s*\n([\s\S]*?)\n---/.exec(markdown || "")
    const m = fm && /^theme:\s*["']?([\w-]+)["']?\s*$/m.exec(fm[1])
    return m ? m[1] : null
}

function loadTheme(name) {
    if (!themeCache[name]) {
        themeCache[name] = axios.get(THEMES_URL + name + ".css", { responseType: "text" })
            .then(res => res.data)
            .catch(e => { console.warn("SlidesMarp: tema '" + name + "' não encontrado em " + THEMES_URL, e); return null })
    }
    return themeCache[name]
}

export default {
    props: {
        component: Object,
        refreshFlag: Number
    },
    data: () => ({
        current: 0,
        total: 0,
        overview: false,
        reachedEnd: false,
        status: "loading_component",
        browserHelper: undefined,
        styleEl: undefined,
        rendered: { html: "", css: "" },
        renderSeq: 0,
    }),
    computed: {
        options() { return (this.component['MarpSlidesCustomize'] || [])[0] || {}; },
        classes() { return this.options['MarpSlidesClasses'] || ""; },
        button_classes() {
            return `transition ease-in-out duration-300
            rounded-md border border-green-600 border-2 border-gray-600
            shadow-sm transform hover:translate-x-0.5 p-2 bg-emerald-300 hover:bg-emerald-500`;
        },
        markdownContent: {
            get() { return this.component["MarpContent"] || loading_message; },
            set(newValue) { this.component['MarpContent'] = newValue; }
        },
        concurrentScript() { return this.options["MarpConcurrentScript"]; },
        concurrentArgs() { return this.options['MarpSlidesArg'] || []; },
        hasConcurrent() { return !!(this.concurrentScript && this.concurrentScript.trim() !== ""); }
    },
    methods: {
        slideEls() {
            return this.$refs.slides ? Array.from(this.$refs.slides.querySelectorAll('svg[data-marpit-svg]')) : [];
        },
        applyStyle() {
            if (!this.styleEl) {
                this.styleEl = document.createElement('style');
                document.head.appendChild(this.styleEl);
            }
            this.styleEl.textContent = this.rendered.css;
        },
        async prepare() {
            const markdown = decodeEntities(this.markdownContent);
            const seq = ++this.renderSeq;
            // script:false -> o helper do browser é aplicado por nós (marpBrowser), sem <script> inline
            const marp = new Marp({ script: false });
            const theme = themeName(markdown);
            if (theme && !BUILTIN_THEMES.includes(theme)) {
                const css = await loadTheme(theme);
                if (css) marp.themeSet.add(css);
            }
            if (seq !== this.renderSeq) return; // entretanto chegou outro conteúdo
            this.rendered = marp.render(markdown);
            this.applyStyle();
            this.$nextTick(() => {
                if (this.browserHelper) this.browserHelper.update();
                else if (this.$refs.slides) this.browserHelper = marpBrowser(this.$refs.slides);
                this.total = this.slideEls().length;
                this.overview = false;
                this.go(0);
            });
        },
        go(index) {
            if (this.total === 0) return;
            this.current = Math.max(0, Math.min(index, this.total - 1));
            this.slideEls().forEach((el, i) => el.classList.toggle('marp-active', i === this.current));
            if (this.hasConcurrent && this.current === this.total - 1 && !this.reachedEnd
                && this.markdownContent !== loading_message) {
                this.reachedEnd = true;
            }
        },
        focusDeck(e) {
            if (this.overview) {
                const svg = e.target.closest && e.target.closest('svg[data-marpit-svg]');
                const index = this.slideEls().indexOf(svg);
                if (index >= 0) {
                    this.overview = false;
                    this.go(index);
                }
            }
            this.$refs.deck.focus();
        },
        toggleFullscreen() {
            if (document.fullscreenElement) document.exitFullscreen();
            else if (this.$refs.deck.requestFullscreen) this.$refs.deck.requestFullscreen();
        },
        onKey(e) {
            switch (e.key) {
                case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
                    this.go(this.current + 1); break;
                case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
                    this.go(this.current - 1); break;
                case 'Home': this.go(0); break;
                case 'End': this.go(this.total - 1); break;
                case 'f': case 'F': this.toggleFullscreen(); break;
                case 'o': case 'O': this.overview = !this.overview; break;
                case 'Escape': this.overview = false; return; // o browser trata a saída do ecrã inteiro
                default: return;
            }
            e.preventDefault();
            e.stopPropagation();
        },
        closeModal() {
            this.$emit('show-modal', undefined);
        },
        callConcurrentScript() {
            this.status = "confirmingVisualization";
            let args = {};
            args['myArguments'] = this.concurrentArgs.map(myArg => myArg['MarpSlidesArg']);
            axios.post(concurrent_dir + this.concurrentScript, args).then(() => {
                this.markdownContent = loading_message;
                setTimeout(() => {
                    this.$emit('refresh');
                    this.closeModal();
                }, 1500);
            }).catch(e => {
                throw (e);
            });
        },
        confirmContentVisualization() {
            this.callConcurrentScript()
        },
    },
    watch: {
        markdownContent(newContent, oldContent) {
            if (oldContent != newContent && newContent.trim() != "" && newContent != loading_message) {
                this.reachedEnd = false;
                this.status = "loaded";
                this.prepare();
            }
        },
        refreshFlag() {
            this.reachedEnd = false;
            this.status = "loaded";
            this.prepare();
        }
    },
    mounted() {
        this.prepare();
    },
    beforeDestroy() {
        if (this.browserHelper) this.browserHelper.cleanup();
        if (this.styleEl) this.styleEl.remove();
    },
    components: { Waiting2 }
}
</script>

<style>
.marp-deck {
    position: relative;
    outline: none;
    background: #000;
    overflow: hidden;
}
.marp-deck svg[data-marpit-svg] {
    display: none;
    width: 100%;
    height: auto;
}
.marp-deck svg[data-marpit-svg].marp-active {
    display: block;
}
.marp-deck:fullscreen {
    display: flex;
    align-items: center;
    justify-content: center;
}
.marp-deck:fullscreen .marp-slides {
    width: min(100vw, calc(100vh * 16 / 9));
}
.marp-overview {
    background: #e5e7eb;
    max-height: 80vh;
    overflow-y: auto;
}
.marp-overview .marp-slides > .marpit {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    padding: 0.75rem;
}
.marp-overview svg[data-marpit-svg] {
    display: block;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.marp-overview svg[data-marpit-svg].marp-active {
    outline: 3px solid #10b981;
}
.marp-controls {
    position: absolute;
    right: 0.75rem;
    bottom: 0.5rem;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #fff;
    font-size: 0.875rem;
    text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}
.marp-controls button {
    font-size: 1.5rem;
    line-height: 1;
    padding: 0 0.4rem;
    cursor: pointer;
}
.marp-controls button:disabled {
    opacity: 0.3;
    cursor: default;
}
</style>
