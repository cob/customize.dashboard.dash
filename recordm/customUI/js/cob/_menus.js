cob.custom.customize.push(function (core, utils, _ui) {
   utils.loadCSS("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css")
   
   core.customizeMenu((model) => {
      // For legacy porpose start by storing the pre-defined menu configured on recordm/services/com.cultofbits.web.integration.properties
      // and then remove all entries that we know we're going to add on other pre-defined dashboards
      const cleanMenus = model.menus.filter(v => ["Home", "reports", "rm-importer-stats", "@"].reduce((pr, x) => pr && v.name.indexOf(x) != 0, true))

      // For anonymous user don't do any menu customization
      if (core.getCurrentLoggedInUser() != 'anonymous') {

         // The function that will be called once we have backend (or cache) information on current user Solutions access (ie, distinct values of Solution field of available dashboard instances)
         let updateMenu = (solutions) => {
            model.menus.length = 0 //We will re-build completly the menu

            // Check for stored last dashboard page (recorded in dash component at every request) to be used in case the url doesn't specify a specific destinations (ie, https://server.com/recordm/ and the first menu entry - this - will be used)
            const lastDash = localStorage.getItem("lastDash-" + core.getCurrentLoggedInUser())
            if (lastDash) {
               // If we have a previous page in this browser localStorage we create a initial, invisible menu entry wich will be used if the url doesn't have a specific page specified
               model.menus.push({
                  name: "  ", // ie, just a space makes it invisible
                  href: "cob.custom-resource/" + lastDash + "/dash"
               })
            }
            
            // Customize meny if the user has at least access to one solution
            const numberOfSolutions = solutions.value.length
            if(numberOfSolutions > 0) {

               // If the user has access to more then 1 solution we add a solution chooser link (make sure there's a Home dashboard created for this purpose)
               if(numberOfSolutions > 1 ) {
                  model.menus.push({ 
                     name: "<i class='fa-solid fa-house'></i>", 
                     href: "cob.custom-resource/Home/dash"
                  });
               }
               
               // Iterate the diferent solutions - TODO: currently in reverse order of ID but in future should use a order field
               for(let i = numberOfSolutions-1; i >= 0; i--) {
                  const solution = solutions.value[i]

                  // If this solution only has a single dashboard make the entry a direct link to that dashboard
                  if (solutions.hits[solution].hits.length === 1) {
                     model.menus.push({
                        name: solution,
                        href: "cob.custom-resource/" + solutions.hits[solution].hits[0].id + "/dash"
                     })
                  } 
                  // Otherwise the solution has multiple dashboards and we add a menu entry for the solution it self 
                  else {
                     // The default link will be the solution name (meaning we will show the default CHOOSER with all relevant dashboard options)
                     let dashLink = solution

                     // Nonetheless lets check if there's a last dashboard used for this specific solution and, if so, change the default link to this previous choice
                     const lastSolutionDash = localStorage.getItem("lastDash-" + core.getCurrentLoggedInUser() + "-" + solution)
                     if (lastSolutionDash) {
                        dashLink = lastSolutionDash
                     }
        
                     // Add the entry with the decided link
                     model.menus.push({
                        name: solution,
                        href: "cob.custom-resource/" + dashLink + "/dash"
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