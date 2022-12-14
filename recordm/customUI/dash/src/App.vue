<template>
    <div class="h-full w-full">
        <div v-if="error || chooserError" class="text-center my-20 text-2xl text-red-500"> {{error}} {{chooserError}} </div>
        <Dashboard v-else-if="dashboardProcessed" :dashboard="dashboardProcessed" :userInfo="userInfo"/>
        
        <Waiting2 v-if="processingFlag" class="fixed top-16 right-0"/>
    </div>
</template>

<script>
import axios from 'axios';
import {umLoggedin} from '@cob/rest-api-wrapper';
import {instancesList} from '@cob/dashboard-info';
import * as dashFunctions from '@cob/dashboard-info';
import {parseDashboard} from './collector.js'
import Dashboard from './components/Dashboard.vue'
import Waiting2 from './components/shared/Waiting2.vue'
import Handlebars from "handlebars";
import traverse from "traverse";

const DASHBOARD_DEF = "Dashboard_v1"
const DASHBOARD_CHOOSER = "CHOOSER"

export default {
  name: 'App',
  components: { Dashboard, Waiting2 },
  data: () => ({
    error: "",
    chooserError: "",
    userInfo: null,
    dashboardName: null,
    dashboardArg: null,
    dashboardChooser: null,
    dashboardList: null,
    dashboardTemplate: null,
    dashboardProcessor: null,
    dashboardContext: {},
    dashboardProcessed: null
  }),
  created() {
    // Load the chooser dashboard, to be used in case there's more than one dashboard found for a given name and a given user
    this.dashboardChooser = instancesList(DASHBOARD_DEF, "name.raw:\""+DASHBOARD_CHOOSER+"\"", 1)

    // At the initial load we get the dashboard instance name from the url
    umLoggedin().then( userInfo => {
      this.userInfo = userInfo
      this.dashboardName = document.getElementsByClassName("custom-resource")[0].getAttribute('data-name').split(":")[0]
      this.dashboardArg = document.getElementsByClassName("custom-resource")[0].getAttribute('data-name').substring(this.dashboardName.length+1)
      this.dashboardList = instancesList(DASHBOARD_DEF, this.dashboardQuery, 100)
    })

    // Upon anchor navigation we get the dashboard instance name from the first param to the 'resume' callback.
    $('section.custom-resource').on('resume', (e, params) => {
      //Recheck user (the user might have changed or his groups might have changed after previous load)
      umLoggedin().then(userInfo => {
        let name = params[0].split(":")[0]

        if( name !== this.dashboardName || this.userInfo.username !== userInfo.username ){
          this.userInfo = userInfo
          this.dashboardName = name
          this.dashboardArg = params[0].substring(name.length+1)
          this.dashboardList.changeArgs({query: this.dashboardQuery })
        }
      })
    });
  },
  computed: {
    processingFlag() {
      return this.dashboardProcessed == null 
             || this.dashboardList.state === 'updating' 
             || this.dashboardList.state === 'loading'
    },
    dashboardQuery() {
      let groups = this.userInfo.groups.length && this.userInfo.groups.map(g=> "\"" + g.name + "\"").join(" OR ") || ""
      let nameQuery = "name.raw:\"" + this.dashboardName + "\" "
      let accessQuery = " (groupaccess.raw:(" + groups + ") OR (-groupaccess:*) )"
      return "(" + nameQuery + accessQuery +") OR id:" + this.dashboardName
    }
  },
  watch: {
    // Monitor changes to the status of getting the Dashboard list
    'dashboardList.state'(newDashboardListState) {
      if(newDashboardListState === "error") {
        // Special treatment for 430 (unauthorized) error:
        if(this.dashboardList.errorCode === 403) {
          // check who's the new user:
          umLoggedin().then( userInfo => {
            if(userInfo.username === "anonymous") {
              // If the user is anonymous it means we timed out the cookie validity. Two situations are possible:
              axios.get(document.location)
              .then(() => {
                // If we have permissions to get the current page it means we are on a server where 
                // anonymous has access to custom resources. We can only redirect to root to force the auth. 
                // Unfortunatly the user will need to re-navigate to the page where he was
                debugger
                document.location = "/" 
              })
              .catch(() => {
                // otherwiser we can do a reload at the same url wich will fire the auth page
                document.location.reload()
              })

            } else {
              // Otherwise the user changed (in another tab) OR the user groups changed OR the dashboards access groups changed: send to root !
              document.location = "/" 
            }
          })
        } else {
          this.error = "Error: error getting dashboard (" + this.dashboardList.errorCode + ")"
        }
      } else {
        this.error = ""
      }
    },

    // Monitor changes to the values of the Dashboard list
    'dashboardList.value'(newDashboardListValue) {
      if(newDashboardListValue.length === 0) {
        this.error = "Error: dashboard '" + this.dashboardName + "' was not found for your user"
      } else if (newDashboardListValue.length > 1) {
          //More then 1 dashboard found: show generic dashboard to choose from
          if(this.dashboardChooser.value) {
            // if we already have the dashboardChoose loaded use it, otherwise do nothing and it will be loaded once 'dashboardChooser.value' is loaded 
            this.loadDashboardInstance(this.dashboardChooser.value[0].id);
          } 
      } else {
        //Exactly one instance found, load it
        let newDashboardId =  newDashboardListValue[0].id
        this.loadDashboardInstance(newDashboardId);
      }
    },

    //Monitor for initial load of dashboardChooser, in case there's already alternativeDashboards to be displayed (and the dashboardChooser was not ready)
    'dashboardChooser.value'(chooserDashboard) {
      if(chooserDashboard.length) {
        if(this.dashboardList && this.dashboardList.value && this.dashboardList.value.length > 1) {
          this.loadDashboardInstance(chooserDashboard[0].id);
        }
      } else {
        this.chooserError = "Error: dashboard " + DASHBOARD_CHOOSER + " was not found"
      }
    },

    dashboardContext: { 
      handler (newContext) {
        debugger
        this.buildDashboard()
      },
      deep: true
    }

  },
  methods: {
    loadDashboardInstance(dashboardId) {
      axios.get("/recordm/recordm/instances/" + dashboardId)
        .then(resp => {
          this.error = ""
          try {
            const dashboardParsed = parseDashboard(resp.data)
            this.setCompiledDashboard(dashboardParsed)
            this.dashboardContext = this.getContext(dashboardParsed, this.dashboardList)
            this.buildDashboard()
            
            //Set the page title
            document.title = "Recordm[" + dashboardParsed.Name + "]"
          }
          catch(e) {
            this.error = "Error: error parsing dashboard " + dashboardId + " (" + e + ")"
            console.error(e)
          }
        })
        .catch( (e) => {
          if( e.response && e.response.status && e.response.status === 403) {
            this.error = "New authorization required..."
          } else {
            this.error = "Error: error getting dashboard " + dashboardId
          }
          console.error(e)
        })
    },

    setCompiledDashboard(dashboardParsed) {
      let replaceList = []
      let template = this.JsonStringifyWithBlockHelpers(dashboardParsed,replaceList)
      for(let i=replaceList.length-1; i > -1 ; i--) {
        template = template.replace('"#REPLACE'+i+'"',replaceList[i]) // The replacement of blocks must include de " " that were put around the block
      }      
      this.dashboardTemplate = template
      this.dashboardProcessor = Handlebars.compile(template)
    },

    getContext(dashboardParsed, dashboardList) {
      let context
      try {
        function list(...args) {
          return instancesList(...args)
        }
        eval("context = " + dashboardParsed.DashboardCustomize[0].Context)
      } catch(e) {
        debugger
      }

      context = context || {}

      context.dashboards = dashboardList.value.slice().reverse();
      context.arg = this.dashboardArg;
      context.user = this.userInfo;

      return context;
    },

    buildDashboard() {
      if(this.dashboardContext) {
        let result = this.dashboardProcessor(this.dashboardContext).replaceAll(/,\s*]/g,"]").replaceAll(/(,\s*)+/g,",") // Every last comma in arrays OR double comma in the resulting arrays are to be removed
        let dash = JSON.parse(result)
        
        //Make common 'vars' object that will be available to every components in component.vars
        dash.vars = {} 

        // Add extra info to structure
        for( let b of dash["Board"]) { 
          for( let c of b.Component) {
            // Add user info for permission evaluations
            c.userInfo = this.userInfo
            c.vars = dash.vars

            if (c.Component === "Menu") {
                c.Text.forEach(t => {
                    // If Attention is configured for this menu line then add attention status as user check
                    if (t["TextCustomize"][0]["TextAttention"]) {
                        t["TextCustomize"][0].AttentionInfo = dashFunctions.instancesList("Dashboard-Attention", "name.raw:" + t["TextCustomize"][0]["TextAttention"], 1, 0, {validity: 30})
                    }
                })
            } else if (c.Component === "Totals") {
                for(let l of c.Line) {
                    l.Value = l.Value.map(v => {
                        if (v.Arg[2] && (v.Arg[2] + "").startsWith("{")) {
                            v.Arg[2] = JSON.parse(v.Arg[2])
                        }
                        // If Attention is configured for this value line then add attention status as user check
                        if (v["ValueCustomize"][0]["ValueAttention"]) {
                            v["ValueCustomize"][0].AttentionInfo = dashFunctions.instancesList("Dashboard-Attention", "name.raw:" + v["ValueCustomize"][0]["ValueAttention"], 1, 0, {validity: 10})
                        }

                        if (v.Value === 'Label') {
                            v.dash_info = {value: v.Arg[0].Arg, state: "ready"}
                        } else if (v.Value === 'link') {
                            v.dash_info = {value:  v.Arg[1].Arg, href:  v.Arg[0].Arg, state: "ready", isLink: true}
                        } else {
                            // add dash-info values in Totals
                            v.dash_info = dashFunctions[v.Value].apply(this, v['Arg'].map( a => a['Arg'] )) // Return DashInfo, which is used by the component
                        }
                        return v
                    })
                }
            } else if (c.Component === "Kibana") {
                if (c["KibanaCustomize"][0]["InputQueryKibana"] !== null) {
                    c["KibanaCustomize"][0]["InputQueryKibana"] = c["KibanaCustomize"][0]["InputQueryKibana"].replaceAll("__USERNAME__", c.userInfo.username)
                }
            }
          }
        }

        this.$set(this,"dashboardProcessed", dash)
      }
    },

    JsonStringifyWithBlockHelpers(json,replaceList) {
      // Replacements will occur on every duplicate field of the dashboard instance that has a value starting with "{{#each something}} ..." or other block helper
      const me = this
      const newJson = traverse(json).map(function(node) {
        // If the node has a property with the same name as the name of the enclosing property (ie, something like 'Board' im '{ Board: [ { ..., Board:"string value",...}, ...]}' ) test for the block pattern 
        // (this will be the situation for all duplicate fields, as set by the collector)
        const epn = this.parent && this.parent.key; //EPN = Enclosing Property Name
        const propertyValueForEPN = node && epn && typeof (node[epn])==="string" && node[epn];
        const blockExpression = propertyValueForEPN && propertyValueForEPN.match(/^\s*{{#(\w+)\s+([^}]*)}}(.*)/);

        if(blockExpression) {
          node[epn] = blockExpression[3]; // Remove the block expression from the dashboard object and leave the remaining content
          const textToReplaceNode = "{{#" + blockExpression[1] + " " + blockExpression[2] + "}} " + me.JsonStringifyWithBlockHelpers(node,replaceList) + ", {{/"+blockExpression[1]+"}}"
          this.update("#REPLACE"+replaceList.length, true)
          replaceList.push(textToReplaceNode)
        }
      })
      return JSON.stringify( newJson )
    }
  }
}
</script>