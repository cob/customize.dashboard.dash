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
import {parseDashboard} from './collector.js'
import Dashboard from './components/Dashboard.vue'
import Waiting2 from './components/shared/Waiting2.vue'
import Handlebars from "handlebars";

const DASHBOARD_DEF = "Dashboard_v1"
const DASHBOARD_CHOOSER = "CHOOSE"

export default {
  name: 'App',
  components: { Dashboard, Waiting2 },
  data: () => ({
    error: "",
    chooserError: "",
    userInfo: null,
    dashboardName: null,
    dashboardList: null,
    dashboardChooser: null,
    alternativeDashboards: [],
    dashboardParsed: null
  }),
  created() {
    // At the initial load we get the dashboard instance name from the url
    umLoggedin().then( userInfo => {
      this.userInfo = userInfo
      this.dashboardName = document.getElementsByClassName("custom-resource")[0].getAttribute('data-name').split(":")[0]
      this.dashboardList = instancesList(DASHBOARD_DEF, this.dashboardQuery, 100)
      this.dashboardChooser = instancesList(DASHBOARD_DEF, "name.raw:"+DASHBOARD_CHOOSER, 1)
    })

    // Upon anchor navigation we get the dashboard instance name from the first param to the 'resume' callback.
    $('section.custom-resource').on('resume', (e, params) => {
      //Recheck user (the user might have changed or his groups might have changed after previous load)
      umLoggedin().then(userInfo => {
        let name = params[0].split(":")[0]
        if( name !== this.dashboardName || this.userInfo.username !== userInfo.username ){
          this.userInfo = userInfo
          this.dashboardName = name
          this.dashboardList.changeArgs({query: this.dashboardQuery })
        }
      })
    });
  },
  computed: {
    processingFlag() {
      return this.dashboardParsed == null 
             || this.dashboardList.state === 'updating' 
             || this.dashboardList.state === 'loading'
    },
    dashboardQuery() {
      let groups = this.userInfo.groups.map(g=> "\"" + g.name + "\"").join(" OR ")
      let nameQuery = "name.raw:\"" + this.dashboardName + "\" "
      let accessQuery = " (groupaccess.raw:(" + groups + ") OR (-groupaccess:*) )"
      return "(" + nameQuery + accessQuery +") OR id:" + this.dashboardName
    }
  },
  watch: {
    // Monitor changes to the status of getting the Dashboard list
    'dashboardList.state'(instanceInfoState) {
      if(instanceInfoState === "error") {
        // Special treatment for 430 (unauthorized) error:
        if(this.dashboardList.errorCode === 403) {
          // check who's the new user:
          umLoggedin().then( userInfo => {
            if(userInfo.username === "anonymous") {
              // If the user is anonymous it means we timed out the cookie validity - reload at the same url
              document.location.reload()
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
    'dashboardList.value'(newDashboardList) {
      if(newDashboardList.length === 0) {
        this.error = "Error: dashboard '" + this.dashboardName + "' was not found for your user"
      } else if (newDashboardList.length > 1) {
          //More then 1 dashboard found: show generic dashboard to choose from
          this.alternativeDashboards = newDashboardList
          if(this.dashboardChooser && this.dashboardChooser.value) {
            this.loadDashboardInstance(this.dashboardChooser.value[0].id);
          } // otherwise it will be loaded once 'dashboardChooser.value' is loaded 
      } else {
        //Exactly one instance found
        this.alternativeDashboards = []
        let newDashboardId =  newDashboardList[0].id
        this.loadDashboardInstance(newDashboardId);
      }
    },

    //Monitor for initial load of dashboardChooser, in case there's already alternativeDashboards to be displayed (and the dashboardChooser was not ready)
    'dashboardChooser.value'(chooserDashboard) {
      if(chooserDashboard.length === 1) {
        if(this.alternativeDashboards.length > 0) {
          this.loadDashboardInstance(chooserDashboard[0].id);
        }
      } else {
        this.chooserError = "Error: dashboard CHOOSER was not found"
      }
    }
  },
  methods: {
    loadDashboardInstance(dashboardId) {
      axios.get("/recordm/recordm/instances/" + dashboardId)
        .then(resp => {
          try {
            let dashboardParsed = parseDashboard(resp.data, this.userInfo)
            if (this.alternativeDashboards.length) {
              let boardTemplate = dashboardParsed.Board.pop()
              for(const alternativeDash of this.alternativeDashboards){
                const resultingBoard = this.boardFromBoardTemplate(boardTemplate,alternativeDash)
                dashboardParsed.Board.push(resultingBoard)
              }
            }
            this.dashboardParsed = dashboardParsed
            //Set the page title
            document.title = "Recordm[" + this.dashboardName + "]"
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
    
    boardFromBoardTemplate(boardTemplate, alternativeDash) {
      let cloneBoard = JSON.parse(JSON.stringify(boardTemplate))
      cloneBoard.Component[0].Text[0].Text = alternativeDash.description[0]
      cloneBoard.Component[0].Text[0].Link = alternativeDash.url[0]
      return cloneBoard
    }
  }
};
</script>