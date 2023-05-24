cob.custom.customize.push(function (core, utils, _ui) {
   core.customizeMenu((model) => {
      const cleanMenus = model.menus.filter(v => ["Home", "reports", "rm-importer-stats", "@"].reduce((pr, x) => pr && v.name.indexOf(x) != 0, true))

      if (core.getCurrentLoggedInUser() != 'anonymous') {
         const groupsArray = core.getGroups();

         let updateMenu = (solutions) => {
            model.menus.length = 0 // NOTE: remove first entry, that should be the dash entry
            if(solutions.value.length > 0) {
               for(let i = solutions.value.length-1; i >= 0; i--) {
                  const solution = solutions.value[i]
                  if(solutions.value.length > 1 && i === solutions.value.length-1) {
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
            model.menus.push(...cleanMenus); // NOTE: this should not do any difference if server is configured with only dashboards
            core.publish('updated-app-info'); 
         }

         const groups = groupsArray && groupsArray.map(g => "\"" + g + "\"").join(" OR ") 
         const query = " ( groupaccess.raw:(" + groups + ") OR (-groupaccess:*) )"

         window.cob.app = { getCurrentLoggedInUser :  core.getCurrentLoggedInUser } //Hack to make getCurrentLoggedInUser available to the dashInfo from the start (otherwise it will have to do a query to userm and the next call will be async, not having an answer in T0)
         //Assumes cobDashboarInfo was loaded on customizations2.js
         cobDashboardInfo.fieldValues(89, "solution.raw", query, 100, { changeCB: updateMenu })
      }
   });
});