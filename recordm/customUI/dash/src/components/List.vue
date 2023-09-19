<template>
    <section class="cob-app search-definition content">
        <div id="simplesearch-container"></div>
    </section>
</template>

<script>
    export default {
        props: { component: Object },
        data: () => ({
            simpleSearch: null
        }),
        mounted() {
            debugger
            setTimeout(this.updateQuery, 10)
        },
        computed: {
            options()         { return this.component['ListCustomize'][0] },
            definition()      { return this.component['ListDefinition']      || "" },
            query()           { return this.component['ListQuery']      || "" },
            classes()         { return this.options['ListClasses'] || "text-center font-bold pb-2 " },
            inputs()          { return this.options['InputVarList'].map(v => v['InputVarList']) },
            inputFilter()     { return this.inputs.filter(v => this.component.vars[v]).map(v => this.component.vars[v]).join(" ")},
            queryWithFilter() { return (this.query + " " + this.inputFilter.trim()) },
        },
        watch: {
            inputFilter()     { this.updateQuery() }
        },
        methods: {
            updateQuery() {
                if(this.simpleSearch && this.simpleSearch.setSearchValue ) {
                    this.simpleSearch.setSearchValue(this.queryWithFilter)
                } else {
                    this.simpleSearch = new cob.components.SimpleSearch(cob.app, "#simplesearch-container",this.definition, this.queryWithFilter, {
                        activeVisualizationName: "VMovimentos",
                        showViews: true,
                        showActions: true,
                        showCreateAndDelete: true
                    });
                }
            }
        },
   }
</script>

<style>
    .cob-app.search-definition {
        box-sizing: unset;
        position: unset; 
        background-color: white;
    }
    .slick-header-menu {
        z-index: 1;
    }
</style>