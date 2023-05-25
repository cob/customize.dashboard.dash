cob.custom.customize.push(function (core, utils, _ui) {
   core.customizeMenu((model) => {
      // For legacy porpose start by storing the pre-defined menu configured on recordm/services/com.cultofbits.web.integration.properties
      // and then remove all entries that we know we're going to add on other pre-defined dashboards
      const cleanMenus = model.menus.filter(v => ["Home", "reports", "rm-importer-stats", "@"].reduce((pr, x) => pr && v.name.indexOf(x) != 0, true))

      // For anonymous user don't do any menu customization
      if (core.getCurrentLoggedInUser() != 'anonymous') {

         // The function that will be called once we have backend (or cache) information on current user Solutions access (ie, distinct values of Solution field of available dashboard instances)
         let updateMenu = (solutions) => {
            model.menus.length = 0 //We will re-build completly the menu
                     model.menus.push({ 
                        name: "<i class='fa-solid fa-house'></i>", 
                        href: "cob.custom-resource/Home/dash"
                     });
                  }
                  if (solutions.value.length === 1 && solutions.hits[solution].hits.length === 1) {    
                     model.menus.push({
                        name: solution,
                        href: "cob.custom-resource/" + solutions.hits[solution].hits[0].id + "/dash"
                     })
                  } else {                        
                     model.menus.push({
                        name: solution,
                        href: "cob.custom-resource/" + solution + "/dash"
                     })
                  }
               }
            }

            model.menus.push(...cleanMenus); // Restore the legacy stored menu entries removed in the beginning 
            core.publish('updated-app-info');  // Request an update to the built menu
         }

         const userGroups = core.getGroups();
         const groupsQuery = userGroups && userGroups.map(g => "\"" + g + "\"").join(" OR ") 
         const dashboardsQuery = " ( groupaccess.raw:(" + groupsQuery + ") OR (-groupaccess:*) )"

         window.cob.app = window.cob.app || { getCurrentLoggedInUser :  core.getCurrentLoggedInUser } //Hack to make cob.app.getCurrentLoggedInUser available to the dashInfo from the start (otherwise it will have to do a query to userm and the next call will be async, not having an answer at t0)
         cobDashboardInfo.fieldValues(89, "solution.raw", dashboardsQuery, 100, { changeCB: updateMenu }) //Assumes cobDashboarInfo was loaded synchronously on customizations2.js
      }
   });
})