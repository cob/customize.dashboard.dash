<template>
    <div :class="classes" :style="image" v-html="label"></div>
</template>

<script>
    export default {
        props: { component: Object },
        created() {
            if(this.label && this.label.indexOf("script:") === 0) {
                const script = this.label.substring(7)
                eval(script)
            }
        },
        computed: {
            options() { return this.component['LabelCustomize'][0] },
            label()   { return this.component['Label']      || "" },
            classes() { return this.options['LabelClasses'] || "text-center font-bold pb-2 " },
            image()   { return this.options['Image'] ? "background-image: url(" + this.options['Image'] +  ");" : "" }
        }
    }
</script>