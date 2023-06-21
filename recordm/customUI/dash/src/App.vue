<template>
  <div class="h-full w-full">
    <div v-if="error || chooserError" class="text-center my-20 text-2xl text-red-500"> {{ error }} <br> {{ chooserError }} </div>
    <Dashboard v-else-if="activeDashHash" :dashboard="currentDashboard.dashboardProcessed" :menu="currentDashboard.menu" />

    <Waiting2 v-if="processingFlag" class="fixed top-16 right-0" />
  </div>
</template>

<script>
  import axios from 'axios';
  import { umLoggedin } from '@cob/rest-api-wrapper';
  import { instancesList, fieldValues } from '@cob/dashboard-info';
  import * as dashFunctions from '@cob/dashboard-info';
  import { parseDashboard } from './collector.js'
  import Dashboard from './components/Dashboard.vue'
  import Waiting2 from './components/shared/Waiting2.vue'
  import Handlebars from "handlebars";
  import traverse from "traverse";
  import sha256 from "crypto-js/sha256";
  import ComponentStatePersistence from "@/model/ComponentStatePersistence";

  const DASHBOARD_DEF = "Dashboard_v1"
  const DASHBOARD_CHOOSER = "CHOOSER"
  const DEBUG = false

  Handlebars.registerHelper('eq', function (arg1, arg2) { return (arg1 == arg2); });

  export default {
    name: 'App',
    components: { Dashboard, Waiting2 },
    data: () => ({
      error: "",
      chooserError: "",
      dashboardChooser: null,
      activeDashHash: null,
      userGroupsQuery: null,
      dashboardName: null,
      dashboardArg: null,
      dashboardsCached: {},
      dashboardsRequested: [],
      stopContextWatcher: null,
      runningQueries: {},
      hashArg: ""
    }),

    created() {
      const updateRequestData = (userInfo, urlDashPart) => {
        if(DEBUG) console.log("DASH: 1.1 created: updateRequestData: urlDashPart="+ urlDashPart)
        // Check if we are being called after a re-authentication request and, if so, redirect to the previous page the user was 
        const urlBeforeReAuthentication = localStorage.getItem("urlBeforeReAuthentication")
        if (urlBeforeReAuthentication) {
          const storedValues = JSON.parse(urlBeforeReAuthentication)
          if(DEBUG) console.log("DASH: 1.1 created: updateRequestData: because urlBeforeReAuthentication exists use storedValues=",storedValues)
          localStorage.removeItem("urlBeforeReAuthentication")
          urlDashPart = storedValues.urlDashPart
          window.location.hash = storedValues.location
        }

        userInfo.groupsQuery = userInfo.groups.length && userInfo.groups.map(g => "\"" + g.name + "\"").join(" OR ")
        this.userInfo = userInfo
        this.urlDashPart = urlDashPart
        this.dashboardName = urlDashPart.split(":")[0]
        this.dashboardArg = urlDashPart.substring(this.dashboardName.length + 1)
        return urlDashPart
      }

      const dashboardQuery = () => {
        const isSystem = this.userInfo.groups.length && this.userInfo.groups.map(g => g.name).indexOf("System") >= 0
        const accessQuery = isSystem ? "" : " (groupaccess.raw:(" + this.userInfo.groupsQuery + ") OR (-groupaccess:*) )"
        const nameQuery = "( solution_menu.raw:\"" + this.dashboardName + "\"" + " OR name.raw:\"" + this.dashboardName + "\" ) "
        return "(" + nameQuery + accessQuery + ") OR id:\"" + this.dashboardName + "\""
      }

      if(DEBUG) console.log("DASH: 1 created: bind to hash argument")
      this.hashArg = new ComponentStatePersistence("arg")
      
      // Preemptively load the chooser dashboard, to be used in case there's more than one dashboard found for a given name and a given user
      if(DEBUG) console.log("DASH: 1 created: Requesting chooser")
      this.dashboardChooser = instancesList(DASHBOARD_DEF, "name.raw:\"" + DASHBOARD_CHOOSER + "\"", 1, 0, "order", "true", { validity: 600 })

      // At the initial load we get the dashboard instance name from the custom-resource div's attribute "data-name"
      umLoggedin().then(userInfo => {
        const urlDashPart = updateRequestData(userInfo, document.getElementsByClassName("custom-resource")[0].getAttribute('data-name') )
        if(DEBUG) console.log("DASH: 1.2 created: Requesting dashs for '", this.userInfo.username,"'. urlDashPart=", urlDashPart, " query=", dashboardQuery())
        this.dashboardsRequested = instancesList(DASHBOARD_DEF, dashboardQuery(), 99, 0, "order", "false", { validity: 600 })
      })

      // Upon anchor navigation we get the dashboard instance name from the param to the 'resume' callback
      $('section.custom-resource').on('resume', (e, params) => {
        //Recheck user (the user might have changed or his groups might have changed after previous load)
        umLoggedin().then(userInfo => {
          const urlDashPart = updateRequestData(userInfo, params[0] )
          if(DEBUG) console.log("DASH: 1.3 created: Requesting dashs for '", this.userInfo.username,"' after hash change. urlDashPart=", urlDashPart, " query= ", dashboardQuery())
          this.dashboardsRequested.changeArgs({ query: dashboardQuery() })
        })
      });
    },

    beforeDestroy() {
      // Stop all watchers
      if(DEBUG) console.log("DASH: 9 beforeDestroy: Stop all watchers and updates")
      this.$unwatch && this.$unwatch()
      const activeDash = this.dashboardsCached[this.activeDashHash]
      if (activeDash) {
        activeDash.solutionSiblings.stopUpdates()
        if (activeDash.runningQueries) activeDash.runningQueries.forEach(dashInfoItem => dashInfoItem.stopUpdates())
      }
    },

    computed: {
      processingFlag() {
        return this.dashboardsRequested == null
          || this.dashboardsRequested.state === 'updating'
          || this.dashboardsRequested.state === 'loading'
          || Object.values(this.dashboardsCached).filter(d => d.dashboardProcessed == null).length > 0
      },

      currentDashboard() {
        if(DEBUG) console.log("DASH: 6 currentDashboard: update display. activeDashboardId=", this.dashboardsCached[this.activeDashHash].id)
        return (this.dashboardsCached[this.activeDashHash])
      }
    },

    watch: {
      // Monitor changes to the status of getting the Dashboard list
      'dashboardsRequested.state'(newDashboardsRequestedState) {
        if(DEBUG) console.log("DASH: 2 dashboardsRequested.state: newValue=",newDashboardsRequestedState)

        const handleAnonymous = () => {
          if(DEBUG) console.log("DASH: 2.2 dashboardsRequested.state: handleAnonymous: start")
          // If the user is anonymous it means we timed out the cookie validity. Two situations are possible:
          axios.get(document.location)
            .then(() => {
              // If we have permissions to get the current page it means we are on a server where 
              // anonymous has access to custom resources. We can only redirect to root to force the auth.
              // However we save the request hash so we can restore after login
              const storedRestart = { location : window.location.hash, urlDashPart: this.urlDashPart}
              if(DEBUG) console.log("DASH: 2.2 dashboardsRequested.state: handleAnonymous: we can get '",document.location.toString(),"' as anonymous. Set 'urlBeforeReAuthentication' to ", storedRestart)
              localStorage.setItem("urlBeforeReAuthentication", JSON.stringify(storedRestart))
              document.location = "/"
            })
            .catch(() => {
              // otherwise we can do a reload at the same url which will fire the auth page
              document.location.reload()
            })          
        }

        if (newDashboardsRequestedState === "error") {
          // Special treatment for 403 (unauthorized) error:
          if (this.dashboardsRequested.errorCode === 403) {
            if(DEBUG) console.log("DASH: 2 dashboardsRequested.state: error 403 ")
            // check who's the new user:
            umLoggedin().then(userInfo => {
              if (userInfo.username === "anonymous") {
                if(DEBUG) console.log("DASH: 2 dashboardsRequested.state: error 403 and user is anonymous. Handle it ")
                handleAnonymous()
              } else {
                if(DEBUG) console.log("DASH: 2 dashboardsRequested.state: error 403 and user is ",userInfo.username,". Send do '/' ")
                // Otherwise the user changed (in another tab) OR the user's groups changed OR the dashboards access groups changed: send to root !
                document.location = "/"
              }
            })
          } else {
            if(DEBUG) console.log("DASH: 2 dashboardsRequested.state: error getting dashboard. Response=", this.dashboardsRequested)
            this.error = "Error: error getting dashboard (" + this.dashboardsRequested.errorCode + ")"
            this.activeDashHash = null
          }
        } else if (newDashboardsRequestedState === "loading") {
          const reCheckWaitTime = 500
          setTimeout(() => {
            // If still loading after 300ms means we're stuck on anonymous trying to load a dash. For anonymous access to slower pages this value might need to be higher
            if (this.dashboardsRequested.state === "loading") {
              if(DEBUG) console.log("DASH: 2.1 dashboardsRequested.state: rechecking state after " + reCheckWaitTime + "ms and it's still loading")
              // check who's the new user:
              umLoggedin().then(userInfo => {
                if (userInfo.username === "anonymous") {
                  if(DEBUG) console.log("DASH: 2.1 dashboardsRequested.state: rechecking state after " + reCheckWaitTime + "ms and it's  still loading AND user is anonymous. Handle it ")
                  handleAnonymous()
                }
              })
            }
          }, reCheckWaitTime)
        }
      },

      //Monitor for initial load of dashboardChooser, in case there's already alternativeDashboards to be displayed (and the dashboardChooser was not ready)
      'dashboardChooser.value'(chooserDashboard) {
        if(DEBUG) console.log("DASH: 3 dashboardChooser.value: newValue=",chooserDashboard)
        if (chooserDashboard.length) {
          if (this.dashboardsRequested.value && this.dashboardsRequested.value.length > 1) {
            // this is the case where the dashboardRequest was handled faster than the chooserRequest and there's more than 1 dash and, therefore, it wasn't shown on the handling of the dash requests
            if(DEBUG) console.log("DASH: 3 dashboardChooser.value: dashboardsRequested was answered before => run here loadDashboard for dashboardsRequested=", this.dashboardsRequested.value)
            this.loadDashboard(chooserDashboard[0], this.dashboardsRequested.value);
          }
        } else {
          this.chooserError = "Error: dashboard " + DASHBOARD_CHOOSER + " was not found"
        }
      },

      "dashboardsRequested.value": {
        handler(newList) {
          if (!newList) return
          if(DEBUG) console.log("DASH: 4 dashboardsRequested.value: changed! Deciding what to load for dashRequestResults=[" + newList.map(l => l.id + "/" + l.name).join(",") + "]")

          if (newList.length === 0) {
            if(DEBUG) console.log("DASH: 4 dashboardsRequested.value: empty list. Show no dash found")
            this.error = "Error: dashboard '" + this.dashboardName + "' was not found for your user"
            this.activeDashHash = null

          } else if (newList.length === 1) {
            if(DEBUG) console.log("DASH: 4 dashboardsRequested.value: list of 1. loadDashboard for dashRequestResults=",newList[0].id)
            this.loadDashboard(newList[0], newList);

          } else {
            if(DEBUG) console.log("DASH: 4 dashboardsRequested.value: list with more than 1 => use chooser")
            if (this.dashboardChooser.value && this.dashboardChooser.value[0]) {
              // if we already have the dashboardChoose loaded use it, otherwise do nothing and it will be loaded once 'dashboardChooser.value' is called 
              if(DEBUG) console.log("DASH: 4 dashboardsRequested.value: list more than 1 with chooser=", this.dashboardChooser.value[0].id)
              this.loadDashboard(this.dashboardChooser.value[0], newList);
            }
          }
        },
        deep: true
      }
    },

    methods: {
      loadDashboard(newDashEs, requestResultList) {
        if(DEBUG) console.log("DASH: 5 loadDashboard: called with newDashEs=",newDashEs," requestResultList=", requestResultList)
        this.error = ""

        //Calculate the key to use on a cache for each different combination of 1)url arguments AND 2) result list of IDs
        const key = this.dashboardArg + requestResultList.map(d => d.id).join("-")
        const dashKey = "H" + sha256(key).toString().replace("=", "_")

        const compileDashboard = (dashboardParsed) => {
          if(DEBUG) console.log("DASH: 5.1 loadDashboard: compileDashboard: dashboardParsed=",dashboardParsed)

          const JsonStringifyWithBlockHelpers = (json, replaceList) => {
            // Replacements will occur on every duplicate field of the dashboard instance that has a value starting with "{{#each something}} ..." or other block helper
            // replaceList will recursively be set with 
            const newJson = traverse(json).map(function (node) {
              // If the node has a property with the same name as the name of the enclosing property (ie, something like 'Board' in '{ Board: [ { ..., Board:"string value",...}, ...]}' ) test for the block pattern 
              // (this will be the situation for all duplicate fields, as set by the collector)
              const epn = this.parent && this.parent.key; //EPN = Enclosing Property Name
              const propertyValueForEPN = node && epn && typeof (node[epn]) === "string" && node[epn];
              const blockExpression = propertyValueForEPN && propertyValueForEPN.replaceAll("\n", " ").match(/^\s*{{#(\w+)\s+([^}]*)}}(.*)/);

              if (blockExpression) {
                node[epn] = blockExpression[3]; // Remove the block expression from the dashboard object and leave the remaining content
                const textToReplaceNode = "{{#" + blockExpression[1] + " " + blockExpression[2] + "}} " + JsonStringifyWithBlockHelpers(node, replaceList) + ", {{/" + blockExpression[1] + "}}"
                this.update("#REPLACE" + replaceList.length, true)
                replaceList.push(textToReplaceNode)
              }
            })
            return JSON.stringify(newJson)
          }

          let replaceList = []
          let template = JsonStringifyWithBlockHelpers(dashboardParsed, replaceList)
          for (let i = replaceList.length - 1; i > -1; i--) {
            template = template.replace('"#REPLACE' + i + '"', replaceList[i]) // The replacement of blocks must include de " " that were put around the block
          }
          return Handlebars.compile(template)
        }

        const getBaseContext = () => {
          if(DEBUG) console.log("DASH: 5.2 loadDashboard: getBaseContext: ")
          return {
            user: this.userInfo,
            arg: this.hashArg.content,
            name: this.dashboardName,
            vars: {}            
          };
        }

        const baseContextVarsWatcher = (newBaseContextVars) => {
          if(DEBUG) console.log("DASH: 5.2.1 loadDashboard: baseContextVarsWatcher: context changed for '", this.dashboardsCached[dashKey].id + "/" + newDashEs.name,"'. newBaseContext.vars=",JSON.stringify(newBaseContextVars))

          const newContext = getContext(this.dashboardsCached[dashKey])
          this.$set(this.dashboardsCached[dashKey], "dashboardContext", newContext);
        }

        const getContext = (dashboard) => {
          if(DEBUG) console.log("DASH: 5.3 loadDashboard: getContext: dashboard=",dashboard)

          const baseContext = dashboard.dashboardBaseContext

          // This initial code is to allow handelbars on the specifiedContext
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
            eval("specifiedContext = " + (specifiedContextParsed && specifiedContextParsed.replace ? specifiedContextParsed.replace(/&quot;/g, '\"') : "{}"))
          } catch (e) {
            console.error("Error processing specific context:", e)
          }

          // Build final context with all components
          let context = specifiedContext || {}
          context = { dashboardId: dashboard.id, ...baseContext, ...context }
          // Add a copy of dashboardsRequested result in case we need Chooser to display alternatives
          context.dashboards = this.dashboardsRequested.value.slice().reverse();

          return context;
        }

        const contextWatcher = (newContext) => {
          if(DEBUG) console.log("DASH: 5.3.1 loadDashboard: contextWatcher: context changed for '", this.dashboardsCached[dashKey].id + "/" + newDashEs.name,"'. newContext=",newContext)

          const newProcessed = buildDashboard(this.dashboardsCached[dashKey].dashboardProcessor, this.dashboardsCached[dashKey].dashboardContext)
          this.$set(this.dashboardsCached[dashKey], "dashboardProcessed", newProcessed);
        }

        const buildDashboard = (dashboardProcessor, dashboardContext) => {
          if(DEBUG) console.log("DASH: 5.4 loadDashboard: buildDashboard: dashboardContext=",dashboardContext)

          let dash = JSON.parse(
            dashboardProcessor(dashboardContext)
              .replaceAll(/,\s*]/g, "]").replaceAll(/,\s*]/g, "]").replaceAll(/,\s*]/g, "]").replaceAll(/,\s*]/g, "]") // Every last comma in array are removed. Ssupport UP TO 3 consequently commas 
              .replaceAll(/(,(\s*))+/g, ",$2") //  Also remove double comma in the resulting arrays (mantain the spaces in case normal text with commas)
          )

          // Add extra info to structure
          for (let b of dash["Board"]) {
            for (let c of b.Component) {
              c.vars = dashboardContext.vars

              if (c.Component === "Menu") {
                c.Text.forEach(t => {
                  // If Attention is configured for this menu line then add attention status as user check
                  if (t["TextCustomize"][0]["TextAttention"]) {
                    t["TextCustomize"][0].AttentionInfo = dashFunctions.instancesList("Dashboard-Attention", "name.raw:" + t["TextCustomize"][0]["TextAttention"], 1, 0, "", "", { validity: 300 })
                  }
                })
              } else if (c.Component === "Totals") {
                for (let l of c.Line) {
                  l.Value = l.Value.map(v => {
                    if (v.Arg[2] && (v.Arg[2] + "").startsWith("{")) {
                      v.Arg[2] = JSON.parse(v.Arg[2])
                    }
                    // If Attention is configured for this value line then add attention status as user check
                    if (v["ValueCustomize"][0]["ValueAttention"]) {
                      v["ValueCustomize"][0].AttentionInfo = dashFunctions.instancesList("Dashboard-Attention", "name.raw:" + v["ValueCustomize"][0]["ValueAttention"], 1, 0, "", "", { validity: 300 })
                    }

                    if (v.Value === 'Label') {
                      v.dash_info = { value: v.Arg[0].Arg, state: "ready" }
                    } else if (v.Value === 'link') {
                      v.dash_info = { value: v.Arg[1].Arg, href: v.Arg[0].Arg, state: "ready", isLink: true }
                    } else {
                      // add dash-info values in Totals
                      v.dash_info = dashFunctions[v.Value].apply(this, v['Arg'].map(a => a['Arg'])) // Return DashInfo, which is used by the component
                    }
                    return v
                  })
                }
              }
            }
          }
          return dash
        }

        const siblingsWatcher = (newSiblings) => {
          if(DEBUG) console.log("DASH: 5.4.1 loadDashboard: siblingsWatcher: changed. newSiblings==[" + (newSiblings && newSiblings.map(l => l.id + "/" + l.name).join(",") || "") + "]")

          let menu = []
          // only add menu entries in case there's more then 1 dashboard for this solution
          if (newSiblings && newSiblings.length > 1) {
            // Start by adding a menu entry to show the CHOOSER with all the dashboards available
            menu.push({
              name: '<i class="fa-solid fa-table-cells-large"></i>',
              href: "#/cob.custom-resource/" + newSiblings[0].solution_menu[0] + "/dash",
              active: this.dashboardChooser.value && newDashEs.id === this.dashboardChooser.value[0].id
            })

            // Add each of the sibling dashboards
            for (let i = newSiblings.length - 1; i >= 0; i--) {
              const item = newSiblings[i]
              menu.push({
                name: item.name[0],
                href: "#/cob.custom-resource/" + item.id + "/dash",
                active: newDashEs.id === item.id
              })
            }
          }
          // Set the menu and solution for the dashboard being processed
          this.$set(this.dashboardsCached[dashKey], "menu", menu);
        }

        const activateDash = () => {
          if(DEBUG) console.log("DASH: 5.5 loadDashboard: activateDash: restart watchers and queries for ", this.dashboardsCached[dashKey].id)

          // Restart context and sibling Watchers before
          this.dashboardsCached[dashKey].stopBaseContextWatcher = this.$watch("dashboardsCached." + dashKey + ".dashboardBaseContext.vars", baseContextVarsWatcher, { deep: true });
          this.dashboardsCached[dashKey].stopContextWatcher = this.$watch("dashboardsCached." + dashKey + ".dashboardContext", contextWatcher, { deep: true });
          this.dashboardsCached[dashKey].stopSiblingsWatcher = this.$watch("dashboardsCached." + dashKey + ".solutionSiblings.value", siblingsWatcher, { deep: true });

          // Call siblingsWathcer to setup siblings with current siblings (in case there's no change that will call the siblingsWatcher)
          siblingsWatcher(this.dashboardsCached[dashKey].solutionSiblings.value)

          // Update any queries defined in context
          this.dashboardsCached[dashKey].solutionSiblings.update({force:false})
          if (this.dashboardsCached[dashKey].runningQueries) this.dashboardsCached[dashKey].runningQueries.forEach(dashInfoItem => dashInfoItem.update({force:false}))

          //Activate new dashboard
          this.activeDashHash = dashKey;
          document.title = (this.dashboardsCached[dashKey].solution ? this.dashboardsCached[dashKey].solution + " | " : "") +this.dashboardsCached[dashKey].dashboardParsed.Name

          // Set the last visited dash in order to show it in case of a login without specific dashboard destination
          localStorage.setItem(this.userInfo.username + "-lastDash", this.dashboardsCached[dashKey].urlDashPart);
          if(this.dashboardsCached[dashKey].solution) localStorage.setItem(this.userInfo.username + "-lastDash" + "-" + this.dashboardsCached[dashKey].solution, this.dashboardsCached[dashKey].id)
          cob.app.publish('updated-app-info', { rebuildMenu: true });
        }

        const reportError = (error) => {
          this.error = error;
          this.activeDashHash = null
          localStorage.setItem("lastDash-" + this.userInfo.username, "");
          localStorage.setItem("lastDash-" + this.userInfo.username + "-" + (this.dashboardsCached[dashKey] && this.dashboardsCached[dashKey].solution), "")
          cob.app.publish('updated-app-info', { rebuildMenu: true });
        }

        // If current dash exists stop its Context & Siblings Watcher
        const activeDash = this.dashboardsCached[this.activeDashHash]
        if (activeDash) {
          if(DEBUG) console.log("DASH: 5 loadDashboard: stopping watchers and queries for leavingDashboard=", this.dashboardsCached[this.activeDashHash].id)
          if (activeDash.stopContextWatcher) activeDash.stopContextWatcher()
          if (activeDash.stopSiblingsWatcher) activeDash.stopSiblingsWatcher()
          // Stop sibling query and any queries defined in context, if present
          activeDash.solutionSiblings.stopUpdates()
          if (activeDash.runningQueries) activeDash.runningQueries.forEach(dashInfoItem => dashInfoItem.stopUpdates())
        }

        if (this.dashboardsCached[dashKey] !== undefined && this.dashboardsCached[dashKey].version === newDashEs.version) {
          if(DEBUG) console.log("DASH: 5 loadDashboard: dashboard previously processed. Activate newDashId=", newDashEs.id)
          activateDash(dashKey)

        } else {
          // If the dashKey property doesn't exist or it changed version then this is the first time we display this dashboard (at this version) and we need to build it from scratch
          if(DEBUG) console.log("DASH: 5 loadDashboard: first processing of ", newDashEs.id)
          axios.get("/recordm/recordm/instances/" + newDashEs.id)
            .then(resp => {
              try {
                let dash = {};
                dash.dashKey = dashKey;
                dash.id = newDashEs.id;
                dash.solution = newDashEs.solution_menu;
                dash.urlDashPart = this.urlDashPart;
                dash.version = newDashEs.version;
                dash.dashboardParsed = parseDashboard(resp.data);
                dash.dashboardProcessor = compileDashboard(dash.dashboardParsed);
                dash.dashboardBaseContext = getBaseContext();
                dash.dashboardContext = getContext(dash);
                dash.dashboardProcessed = buildDashboard(dash.dashboardProcessor, dash.dashboardContext);
                dash.solutionSiblings = instancesList(DASHBOARD_DEF, "solution.raw:\"" + newDashEs.solution + "\" AND ( groupaccess.raw:(" + this.userInfo.groupsQuery + ") OR (-groupaccess:*) )", 102, 0, "order", "false", { validity: 600 });
                this.$set(this.dashboardsCached, dashKey, dash);
                activateDash(dashKey)
              }
              catch (e) {
                if(DEBUG) console.log("DASH: 5 loadDashboard: Excepcion processing dash. e=", e)
                reportError("Error: error building dashboard " + newDashEs.id + " (" + e + ")")
              }
            })
            .catch((e) => {
              if(DEBUG) console.log("DASH: 5 loadDashboard: error getting dash. e=", e)
              if (e.response && e.response.status && e.response.status === 403) {
                this.error = "New authorization required...";
              } else {
                reportError("Error: error getting dashboard " + newDashEs.id)
              }
            });
        }
      }
    }
  }
</script>