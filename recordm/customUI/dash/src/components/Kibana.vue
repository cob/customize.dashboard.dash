<template>
    <iframe id="kibana" :src="shareLink" width="100%" :onload="updateIFrameStyle()" :class="classes"></iframe>
</template>

<script>
    export default {
        props: {
          component: Object
        },
        data: () => ({
            iFrame: null,
            outputFilter: ""
        }),
        mounted() {
            this.iFrame = this.$el

            this.inputs.forEach(inputVar => {
                this.$watch("component.vars."+inputVar, this.updateKibanaQuery)
            });
            this.updateKibanaQuery()

            window.addEventListener("resize", this.updateIFrameStyle);
            this.updateIFrameStyle();

            window.addEventListener("message", this.processKibanaEvent);
            this.processKibanaEvent();
        },
        computed: {
            options()     { return this.component['KibanaCustomize'][0] },
            shareLink()   { return this.component['ShareLink']   || "" },
            classes()     { return this.options['KibanaClasses'] || "" },
            fixedQuery()  { return this.options['InputQueryKibana']|| "" },
            inputs()      { return this.options['InputVarKibana'].map(v => v['InputVarKibana']) },
            inputFilter() {
              let filters = this.inputs.filter(v => this.component.vars[v]).map(v => this.component.vars[v]);
              if (filters.length == 0) filters.push("*")
              if (this.fixedQuery !== "") filters.push(" AND (" + this.fixedQuery + ")");
              return filters.join(" ")
            },
            outputVar()   { return this.options['OutputVarKibana']     || "" },
        },
        methods: {
            updateIFrameStyle() {
                if(!this.iFrame || !this.iFrame.contentWindow || !this.iFrame.contentWindow.document.head) {
                    //iFrame do Kibana ainda não está pronta. Voltar a tentar em 100ms
                    setTimeout( () => this.updateIFrameStyle(), 100)
                } else {
                    // Ajusta tamanho do iFrame, de acordo com a dimensão do conteúdo, quando a aplicação estiver pronta
                    if (!this.iFrame.contentWindow.document.getElementsByClassName("application").length && !this.iFrame.contentWindow.document.getElementsByClassName("dashboardViewport").length) {
                        //Ainda está a carregar, espera mais um pouco 
                        setTimeout( () => this.updateIFrameStyle(), 100)
                    } else {
                        // Visualizações ainda vai estar a carregar e o tamanho vai variando
                        // Ir actualizando de 100ms em 100ms até 3s (SlowestLoading estimado), 
                        // para ter um comportamento optimizado tão instantânio qt possível
                        const SlowestLoading = 3000
                        for(let t = 100; t < SlowestLoading; t += 100) setTimeout(() => {
                            this.iFrame.style.minHeight = this.iFrame.contentWindow.document.body.scrollHeight + "px"
                        }, t)
                    }

                    // Ajuste ao estilo interno do Kibana, alguns condicionais às classes passadas na iFrame (se ainda não tiver sido feito)
                    if(!this.iFrame.contentWindow.document.getElementById("cobKibanaStyle")) {
                        var s = document.createElement("style");
                        s.id = "cobKibanaStyle";
                        s.appendChild(document.createTextNode([
                            "html, .kbnWelcomeView { background-color: #ffffff00 !important }"
                            , (this.classes.indexOf("kibanaEmbPanelTransparent") !== -1 ? ".euiPanel { background-color: #ffffff00 !important; border:none; box-shadow: none }" : "")
                            , (this.classes.indexOf("kibanaNoNavMenu") !== -1 ? ".kbnTopNavMenu__wrapper { display: none }" : "")
                            ,".visLegend__toggle { display: none!important; }"

                        ].join("\n")));
                        // Aplica dentro de um try catch, porque a iframe Kibana no arranque tem e deixa de ter document.head e dá um erro. Não é um problema pois voltaremos a passar aqui fruto do resize ainda por fazer.
                        try { this.iFrame.contentWindow.document.head.appendChild(s); } catch {}
                    }
                }
            },
            processKibanaEvent(event) {
                // Só vale a pena reagir aos eventos de mudança de filtro no Kibana
                if(event && event.data && event.data.filters) {
                    var filters = []
                    for (let filter of event.data.filters) {
                        let queryStr = "";
                        let negateStr = filter.meta.negate ? "-" : "";
                        let enabled = !filter.meta.disabled;
                        let key;

                        let query = filter.query;

                        if (query.query_string) {
                            // condições incluídas no próprio dashboard via query DSL
                            queryStr = query.query_string.query;

                        } else if (query.query) {
                            queryStr = query.query;

                        } else if (query.match) {
                            key = Object.keys(query.match)[0];
                            queryStr = key + ':"' + query.match[key] + '"';

                        } else if (query.match_phrase) {
                            key = Object.keys(query.match_phrase)[0];
                            let _phrase = query.match_phrase[key];
                            queryStr = key + ':"' + (_phrase instanceof Object ? _phrase.query : _phrase) + '"';

                        } else if (query.bool && query.bool.must.length === 1 && query.bool.must[0].query_string) {
                            // filtros adicionados a partir de visualizações com splits por filtros
                            queryStr = query.bool.must[0].query_string.query;

                        } else {
                            window.console.error('COB', "unknown filter, can't send to RM", filter);
                        }

                        if (enabled) filters.push(negateStr + "(" + queryStr + ")");
                    }
                    this.outputFilter = filters.length > 0 ? filters.join(" AND ") : ""
                    this.$set(this.component.vars, this.outputVar, this.outputFilter)
                }
            },
            updateKibanaQuery() {
                if(!this.iFrame || !this.iFrame.contentWindow || !this.iFrame.contentWindow.document.head || !this.iFrame.contentWindow.document.getElementsByClassName("kbnTopNavMenu__wrapper").length) {
                    //O Kibana ainda não está pronto. Voltar a tentar em 100ms
                    setTimeout(this.updateKibanaQuery, 100)
                } else if(this.inputFilter) {
                    
                    if(this.iFrame.contentWindow.document.getElementsByClassName("euiLoadingChart").length > 0) {
                        //O Kibana já está pronto mas ainda está a carregar dados. Voltar a tentar em 100ms
                        setTimeout(this.updateKibanaQuery, 100)
                    } else {
                        this.iFrame.contentWindow.postMessage({"query":{ "query_string":{ "query": this.inputFilter || "*" } }}, '*');                  
                    }
                }
            }
        }
    }
</script>