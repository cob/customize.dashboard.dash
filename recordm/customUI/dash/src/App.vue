<template>
  <div class="h-full w-full">
      <div v-if="error || chooserError" class="text-center my-20 text-2xl text-red-500"> {{error}} <br> {{chooserError}} </div>
      <Dashboard v-else-if="activeDashHash" :dashboard="currentDashboard.dashboardProcessed" :menu="currentDashboard.menu"/>

      <Waiting2 v-if="processingFlag" class="fixed top-16 right-0"/>
  </div>
</template>

<script>
  import axios from 'axios';
  import {umLoggedin} from '@cob/rest-api-wrapper';
  import { instancesList, fieldValues } from '@cob/dashboard-info';
  import * as dashFunctions from '@cob/dashboard-info';
  import {parseDashboard} from './collector.js'
  import Dashboard from './components/Dashboard.vue'
  import Waiting2 from './components/shared/Waiting2.vue'
  import Handlebars from "handlebars";
  import traverse from "traverse";
  import sha256 from "crypto-js/sha256";

  const DASHBOARD_DEF = "Dashboard_v1"
  const DASHBOARD_CHOOSER = "CHOOSER"

  Handlebars.registerHelper('eq', function(arg1, arg2) { return (arg1 == arg2); });

  export default {
    name: 'App',
    components: { Dashboard, Waiting2 },
    data: () => ({
      error: "",
      chooserError: "",
      dashboardChooser: null,
      activeDashHash:null,
      userGroupsQuery: null,
      dashboardName: null,
      dashboardArg: null,
      dashboardsCached : {},
      dashboardsRequested: [],
      stopContextWatcher:null,
      runningQueries: {}
    }),

    created() {
      const updateRequestData = (userInfo,urlDashPart) =>{
        userInfo.groupsQuery = userInfo.groups.length && userInfo.groups.map(g => "\"" + g.name + "\"").join(" OR ")
        this.userInfo        = userInfo 
        this.urlDashPart     = urlDashPart
        this.dashboardName   = urlDashPart.split(":")[0]
        this.dashboardArg    = urlDashPart.substring(this.dashboardName.length+1)
      }
      const dashboardQuery = () => {
        const isSystem = this.userInfo.groups.length && this.userInfo.groups.map(g => g.name).indexOf("System") >= 0
        const accessQuery = isSystem ? "" : " (groupaccess.raw:(" + this.userInfo.groupsQuery + ") OR (-groupaccess:*) )"
        const nameQuery = "( solution.raw:\"" + this.dashboardName + "\"" + " OR name.raw:\"" + this.dashboardName + "\" ) "
        return "(" + nameQuery + accessQuery + ") OR id:\"" + this.dashboardName + "\""
      }

      // Preemptively load the chooser dashboard, to be used in case there's more than one dashboard found for a given name and a given user
      this.dashboardChooser = instancesList(DASHBOARD_DEF, "name.raw:\""+DASHBOARD_CHOOSER+"\"", 1)

      // At the initial load we get the dashboard instance name from the custom-resource div's attribute "data-name"
      umLoggedin().then( userInfo => {
        const urlDashPart = document.getElementsByClassName("custom-resource")[0].getAttribute('data-name')
        updateRequestData(userInfo,urlDashPart)
        console.log("DASH: initial request: " + dashboardQuery())
        this.dashboardsRequested = instancesList(DASHBOARD_DEF, dashboardQuery(), 100)
      })

      // Upon anchor navigation we get the dashboard instance name from the param to the 'resume' callback
      $('section.custom-resource').on('resume', (e, params) => {
        //Recheck user (the user might have changed or his groups might have changed after previous load)
        umLoggedin().then(userInfo => {
          const urlDashPart = params[0]
          updateRequestData(userInfo,urlDashPart)
          console.log("DASH: change request: " + dashboardQuery())
          this.dashboardsRequested.changeArgs({ query: dashboardQuery() })
        })
      });
    },

    beforeDestroy() {
      // Stop all watchers
      this.$unwatch && this.$unwatch()
    },

    computed: {
      processingFlag() {
        return this.dashboardsRequested == null
          || this.dashboardsRequested.state === 'updating'
          || this.dashboardsRequested.state === 'loading'
          || Object.values(this.dashboardsCached).filter(d => d.dashboardProcessed == null).length > 0
      },

      currentDashboard() {
        return( this.dashboardsCached[this.activeDashHash] )
      }
    },

    watch: {
      //Monitor for initial load of dashboardChooser, in case there's already alternativeDashboards to be displayed (and the dashboardChooser was not ready)
      'dashboardChooser.value'(chooserDashboard) {
        if(chooserDashboard.length) {
          if(this.dashboardsRequested.value && this.dashboardsRequested.value.length > 1) {
            this.loadDashboard(chooserDashboard[0], this.dashboardsRequested.value);
          }
        } else {
          this.chooserError = "Error: dashboard " + DASHBOARD_CHOOSER + " was not found"
        }
      },

      // Monitor changes to the status of getting the Dashboard list
    'dashboardsRequested.state'(newDashboardsRequestedState) {
      if (newDashboardsRequestedState === "error") {
        // Special treatment for 403 (unauthorized) error:
        if (this.dashboardsRequested.errorCode === 403) {
          // check who's the new user:
          umLoggedin().then(userInfo => {
            if (userInfo.username === "anonymous") {
              // If the user is anonymous it means we timed out the cookie validity. Two situations are possible:
              axios.get(document.location)
                .then(() => {
                  // If we have permissions to get the current page it means we are on a server where 
                  // anonymous has access to custom resources. We can only redirect to root to force the auth.
                  // However we save the request hash so we can restore after login
                  localStorage.setItem("dashBeforeReauthentication", document.location.hash)
                  document.location = "/"
                })
                .catch(() => {
                  // otherwise we can do a reload at the same url which will fire the auth page
                  document.location.reload()
                })

            } else {
              // Otherwise the user changed (in another tab) OR the user groups changed OR the dashboards access groups changed: send to root !
              document.location = "/"
            }
          })
        } else {
          this.error = "Error: error getting dashboard (" + this.dashboardsRequested.errorCode + ")"
          this.activeDashHash = null
        }
      }
    },

    "dashboardsRequested.value": {
      handler(newList) {
        // Check if we are being called after a re-authentication request and, if so, redirect to the previous page the user was 
        const dashBeforeReauthentication = localStorage.getItem("dashBeforeReauthentication")
        if (dashBeforeReauthentication) {
          this.$unwatch && this.$unwatch()
          localStorage.setItem("dashBeforeReauthentication", "")
          // Wait a little before redirecting to allow for the response to the existing requests (not catched on time by the $unwatch). Not ideal but only happens with direct links while logged out 
          setTimeout(() => {document.location = dashBeforeReauthentication}, 300)
          return
        }

        if (!newList) return
        console.log("DASH: request result: [" + newList.map(l => l.id + "/" + l.name).join(",") + "]")

        if (newList.length === 0) {
          this.error = "Error: dashboard '" + this.dashboardName + "' was not found for your user"
          this.activeDashHash = null

        } else if (newList.length === 1) {
          this.loadDashboard(newList[0], newList);

        } else {
          if (this.dashboardChooser.value && this.dashboardChooser.value[0]) {
            // if we already have the dashboardChoose loaded use it, otherwise do nothing and it will be loaded once 'dashboardChooser.value' is called 
            this.loadDashboard(this.dashboardChooser.value[0], newList);
          }
        }
      },
        deep: true
      }
    },

    methods: {
      loadDashboard(newDashEs, requestList) {
        this.error = ""

        //Calculate the key to use on a cache for each different combination of 1)url arguments AND 2) result list of IDs
        const key = this.dashboardArg + requestList.map(d=>d.id).join("-")
        const dashKey = "H" + sha256(key).toString().replace("=","_")       

        const compileDashboard = (dashboardParsed) => {
          const JsonStringifyWithBlockHelpers = (json,replaceList) => {
            // Replacements will occur on every duplicate field of the dashboard instance that has a value starting with "{{#each something}} ..." or other block helper
            // replaceList will recursively be set with 
            const newJson = traverse(json).map(function(node) {
              // If the node has a property with the same name as the name of the enclosing property (ie, something like 'Board' in '{ Board: [ { ..., Board:"string value",...}, ...]}' ) test for the block pattern 
              // (this will be the situation for all duplicate fields, as set by the collector)
              const epn = this.parent && this.parent.key; //EPN = Enclosing Property Name
              const propertyValueForEPN = node && epn && typeof (node[epn])==="string" && node[epn];
              const blockExpression = propertyValueForEPN && propertyValueForEPN.match(/^\s*{{#(\w+)\s+([^}]*)}}(.*)/);

              if(blockExpression) {
                node[epn] = blockExpression[3]; // Remove the block expression from the dashboard object and leave the remaining content
                const textToReplaceNode = "{{#" + blockExpression[1] + " " + blockExpression[2] + "}} " + JsonStringifyWithBlockHelpers(node,replaceList) + ", {{/"+blockExpression[1]+"}}"
                this.update("#REPLACE"+replaceList.length, true)
                replaceList.push(textToReplaceNode)
              }
            })
            return JSON.stringify( newJson )
          }

          let replaceList = []
          let template = JsonStringifyWithBlockHelpers(dashboardParsed,replaceList)
          for(let i=replaceList.length-1; i > -1 ; i--) {
            template = template.replace('"#REPLACE'+i+'"',replaceList[i]) // The replacement of blocks must include de " " that were put around the block
          }
          return Handlebars.compile(template)
        }

        const getContext = (dashboard) => {
          // This initial code is to allow handelbars on the specifiedContext 
          const baseContext = {
            user : this.userInfo,
            arg: this.dashboardArg,
            name: this.dashboardName
          };
          const specifiedContextStr = dashboard.dashboardParsed.DashboardCustomize[0].Context
          const specifiedContextParsed = specifiedContextStr ? (Handlebars.compile(specifiedContextStr))(baseContext) : {}

          // Get the specifiedContext evaluated (using available functions: [list] )
          let specifiedContext
          try {
            function list(...args) {            
              const dashInfoItem = instancesList(...args)
              dashboard.runningQueries = dashboard.runningQueries || []
              dashboard.runningQueries.push(dashInfoItem)
              return dashInfoItem
            }
            function distinct(...args) {
              const dashInfoItem = fieldValues(...args)
              dashboard.runningQueries = dashboard.runningQueries || []
              dashboard.runningQueries.push(dashInfoItem)
              return dashInfoItem
            }
            eval("specifiedContext = " + specifiedContextParsed.replace(/&quot;/g, '\"') )
          } catch(e) {
          }

          // Build final context with all components
          let context = specifiedContext || {}
          context = { dashboardId:dashboard.id, ...baseContext, ...context}
          // Add the dashboardList result for Chooser to display
          context.dashboards = this.dashboardsRequested.value.slice().reverse();

          return context;
        }    

        const buildDashboard = (dashboardProcessor, dashboardContext, type) => {
          let dash = JSON.parse(
            dashboardProcessor(dashboardContext)
            .replaceAll(/,\s*]/g,"]").replaceAll(/,\s*]/g,"]").replaceAll(/,\s*]/g,"]").replaceAll(/,\s*]/g,"]") // Every last comma in array are removed. Ssupport UP TO 3 consequently commas 
            .replaceAll(/(,(\s*))+/g,",$2") //  Also remove double comma in the resulting arrays (mantain the spaces in case normal text with commas)
          )

          if(type == "Overview") {
            // TODO
            dash.Board = dash.Board.filter(b => b.Board == "Home Overview")
          } else {
            dash.Board = dash.Board.filter(b => b.Board != "Home Overview")
          }

          //Make common 'vars' object that will be available to every components in component.vars
          dash.vars = {} 

          // Add extra info to structure
          for( let b of dash["Board"]) { 
            for( let c of b.Component) {
              c.vars = dash.vars
    
              if (c.Component === "Menu") {
                  c.Text.forEach(t => {
                      // If Attention is configured for this menu line then add attention status as user check
                      if (t["TextCustomize"][0]["TextAttention"]) {
                          t["TextCustomize"][0].AttentionInfo = dashFunctions.instancesList("Dashboard-Attention", "name.raw:" + t["TextCustomize"][0]["TextAttention"], 1, 0, "", "", {validity: 30})
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
                              v["ValueCustomize"][0].AttentionInfo = dashFunctions.instancesList("Dashboard-Attention", "name.raw:" + v["ValueCustomize"][0]["ValueAttention"], 1, 0, "", "", {validity: 10})
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
              }
            }
          }
          return dash
        }

        const contextWatcher = (newContext, oldContext) => {
          console.log("DASH: updated context: " + this.dashboardsCached[dashKey].id + "/" + newDashEs.name )
          const newProcessed = buildDashboard(this.dashboardsCached[dashKey].dashboardProcessor, newContext)
          this.$set(this.dashboardsCached[dashKey], "dashboardProcessed", newProcessed);
        }

        const siblingsWatcher = (newSiblings, oldSiblings) => {
          let menu = []
          let solution = ""
          // only add menu entries in case there's more then 1 dashboard for this solution
          if(newSiblings && newSiblings.length > 1) {
            solution = newSiblings[0].solution[0] // Equal for all siblings

            // Start by adding a menu entry to show the CHOOSER with all the dashboards available
            menu.push({
              name: '<i class="fa-solid fa-table-cells-large"></i>',
              href: "#/cob.custom-resource/" + solution + "/dash",
              active: this.dashboardChooser.value && newDashEs.id === this.dashboardChooser.value[0].id
            })
            
            // Add each of the sibling dashboards
            for(let i = newSiblings.length-1; i >= 0; i--) {
              const item = newSiblings[i]
              menu.push({
                name:item.name[0],
                href:"#/cob.custom-resource/"+item.id+"/dash",
                active: newDashEs.id === item.id 
              })
            }

            // Setup the menu link for this solution to this specific dashboard for future requests (ie, allways start by showing last choice of dashboard for the solution in question)
            localStorage.setItem("lastDash-"+this.userInfo.username+"-" + solution, this.dashboardsCached[dashKey].urlDashPart)
            cob.app.publish('updated-app-info',{rebuildMenu: true}); 
          }
          // Set the menu and solution for the dashboard being processed
          this.$set(this.dashboardsCached[dashKey], "menu", menu);
          this.$set(this.dashboardsCached[dashKey], "solution", solution);
        }

        const activateDash = () => {
          //Activate new dashboard
          this.activeDashHash=dashKey;

          // Set the last visited dash in order to show it in case of a login withou specific dashboard destination
          localStorage.setItem("lastDash-"+this.userInfo.username, this.dashboardsCached[dashKey].urlDashPart);
          cob.app.publish('updated-app-info',{rebuildMenu: true}); 
        }

        const reportError = (error) => {
          this.error = error;
          this.activeDashHash = null
          localStorage.setItem("lastDash-"+this.userInfo.username, "");          
          localStorage.setItem("lastDash-"+this.userInfo.username+"-" + this.dashboardsCached[dashKey].solution, "")
          cob.app.publish('updated-app-info',{rebuildMenu: true}); 
        }

        if (this.dashboardsCached[dashKey] === undefined || this.dashboardsCached[dashKey].version !== newDashEs.version) {
          // If the dashKey propertie doesn't exist or it changed version then this is the first time we display this dashboard (at this version) and we need to build it from scratch (or rebuild, if is a new version)
          axios.get("/recordm/recordm/instances/" + newDashEs.id)
            .then(resp => {
              try {
                let dash = {};
                dash.dashKey = dashKey;
                dash.id = newDashEs.id;
                dash.urlDashPart = this.urlDashPart;
                dash.version = newDashEs.version;
                dash.dashboardParsed = parseDashboard(resp.data);
                dash.dashboardProcessor = compileDashboard(dash.dashboardParsed);
                dash.solutionSiblings = instancesList(DASHBOARD_DEF, "solution.raw:\""+newDashEs.solution+"\" AND ( groupaccess.raw:(" + this.userInfo.groupsQuery + ") OR (-groupaccess:*) )", 100)
                dash.dashboardContext = getContext(dash);
                dash.dashboardProcessed = buildDashboard(dash.dashboardProcessor, dash.dashboardContext);
                dash.stopContextWatcher = this.$watch("dashboardsCached." + dashKey + ".dashboardContext", contextWatcher, { deep: true }); 
                dash.stopSiblingsWatcher = this.$watch("dashboardsCached." + dashKey + ".solutionSiblings.value", siblingsWatcher, { deep: true }); 
                this.$set(this.dashboardsCached, dashKey, dash);
                activateDash(dashKey)
              }
              catch (e) {
                reportError("Error: error building dashboard " + newDashEs.id + " (" + e + ")")
                console.warn(e);
              }
            })
            .catch((e) => {
              if (e.response && e.response.status && e.response.status === 403) {
                this.error = "New authorization required...";
              } else {
                reportError("Error: error getting dashboard " + newDashEs.id)
              }
              console.warn(e);
            });
        } else {
          // Otherwise we already have all necessary data. 

          // Stop context & siblings Watcher, if present
          if(this.dashboardsCached[this.activeDashHash].stopContextWatcher) this.dashboardsCached[this.activeDashHash].stopContextWatcher()
          if(this.dashboardsCached[this.activeDashHash].stopSiblingsWatcher) this.dashboardsCached[this.activeDashHash].stopSiblingsWatcher()
          // Stop sibling query and any queries defined in context, if present
          this.dashboardsCached[this.activeDashHash].solutionSiblings.stopUpdates()
          if(this.dashboardsCached[this.activeDashHash].runningQueries) this.dashboardsCached[this.activeDashHash].runningQueries.forEach(dashInfoItem => dashInfoItem.stopUpdates())
          
          // Restart context Watcher on entering dashboard
          this.dashboardsCached[dashKey].stopContextWatcher = this.$watch("dashboardsCached." + dashKey + ".dashboardContext", contextWatcher, { deep: true }); 
          this.dashboardsCached[dashKey].stopSiblingsWatcher = this.$watch("dashboardsCached." + dashKey + ".solutionSiblings.value", siblingsWatcher, { deep: true }); 
          // Update sibling query and any queries defined in context
          this.dashboardsCached[dashKey].solutionSiblings.update()
          if(this.dashboardsCached[dashKey].runningQueries) this.dashboardsCached[dashKey].runningQueries.forEach(dashInfoItem => dashInfoItem.update())

          activateDash(dashKey)
        }
      }      
    }
  }
</script>