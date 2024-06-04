<template>
    <section ref="searchContainer" class="cob-app search-definition content"></section>
</template>

<script>
    export default {
        props: { 
          component: Object,
          refreshFlag: Number 
        },
        data: () => ({
            simpleSearch: null
        }),
        mounted() {
            this.$refs.searchContainer.setAttribute("id", this.containerId);
            setTimeout(this.updateQuery, 10)
        },
        beforeDestroy() {
          if (this.simpleSearch) {
            this.simpleSearch.destroy()
          }
        },
        computed: {
            containerId() {return `simple-search-${this._uid}`;},
            options()         { return this.component['ListCustomize'][0] },
            selectedOptions() {
              if (!this.options["ListCustomize"]) return [];
              return this.options["ListCustomize"].split("\u0000");
            },
            definition()      { return this.component['ListDefinition']      || "" },
            query()           { return this.component['ListQuery']      || "" },
            classes()         { return this.options['ListClasses'] || "text-center font-bold pb-2 " },
            inputs()          { return this.options['InputVarList'].map(v => v['InputVarList']) },
            inputFilter()     { return this.inputs.filter(v => this.component.vars[v]).map(v => this.component.vars[v]).join(" ")},
            queryWithFilter() { return (this.query + " " + this.inputFilter.trim()) },
        },
        watch: {
          query() { this.updateQuery() },
          queryWithFilter() { this.updateQuery() }
        },
        methods: {
            updateQuery() {
                if(this.simpleSearch) {
                    this.simpleSearch.setSearchValue(this.queryWithFilter)

                } else {
                  const simpleSearchOptions = {
                    activeVisualizationName: this.options['DefaultView'],
                    showViews: this.selectedOptions.indexOf("ShowViews") !== -1,
                    showActions: this.selectedOptions.indexOf("ShowActions") !== -1,
                    showCreateAndDelete: this.selectedOptions.indexOf("CreateAndDelete") !== -1,
                    showImport: this.selectedOptions.indexOf("ShowImport") !== -1,
                  }
                  this.simpleSearch = new cob.components.SimpleSearch(cob.app, `#${this.containerId}`, this.definition, this.queryWithFilter, simpleSearchOptions);
                }
            },
            refresh_list() {
              if(this.simpleSearch) {
                this.simpleSearch.refresh()
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