import {fieldValues} from "./dashboard-info.esm.js";

const DASHBOARD_DEF = "Dashboard_v1"
const SCOPE_ACCESS_PERMISSION_KEYWORD = "ACESSO ";

cob.custom.customize.push(function (core, utils, _ui) {

   /**
    * -------------------- -------------------- -------------------- --------------------
    Custom getDefaultModuleUri that returns last showed dashboard if it exists as entry page

    Supports using lastDash overrides via `custom-info=last-dash-override` properties in web.properties
    Spaces must be replaced by _ in the props.
    Example:
    custom-info=last-dash-override
    custom-info.last-dash-override.Seleccionar_Empresa=Compras
    custom-info.last-dash-override.2013960=Compras
    **/
   cob.custom.getDefaultModuleUri = function () {
      if (core.getCurrentLoggedInUser() === 'anonymous') {
         return "login";
      }

      var options = core.getAppInfoModel().opts;

      if (options && options.length > 0) {
         // Check for stored last dashboard page (recorded in dash component at every request) 
         let lastDash = localStorage.getItem(core.getCurrentLoggedInUser() + "-lastDash")

         let overrides = core.getAppInfoModel().customInfo["last-dash-override"]
         if (lastDash && overrides) {
            //example if(lastDash == "Seleccionar Empresa") lastDash = "Compras"
            overrides.forEach(item => {
               if (lastDash.replaceAll(' ', '_') === item.key) lastDash = item.value;
            });
         }

         // Use the previous page in this browser localStorage, if we have one, OR the first menu entry 
         return lastDash ? "cob.custom-resource/" + lastDash + "/dash" : options[0].href;

      } else {
         return "forbidden"
      }
   }

   // -------------------- -------------------- -------------------- -------------------- -------------------- 
   // Custom Menu based on existing dashboards
   let solutionDashInfo // Declare it here so it can be used on the addEventListener("cobRefreshMenu")
   let currentMenus  // will be used everywhere in the code to ensure that we're always changing the same model.menu (and not the scoped 'model' inside th customizeMenu)
   let currentApps   // will be used everywhere in the code to ensure that we're always changing the same model.menu (and not the scoped 'model' inside th customizeMenu)

   core.customizeMenu( (model) => {   
      // For anonymous user don't do any menu customization
      if (core.getCurrentLoggedInUser() == 'anonymous') return

      currentMenus = model.menus
      currentApps = model.apps

      // Get all entries relevant to CoB admin. They will be placed on CoB solution submenu
      const cobSubmenus = currentMenus.filter((m) => ["rm-importer-stats", "domains"].indexOf(m.name) >= 0 ).map(m => { m.rel = m.name; return m; }) // Reenable translation with rel attribute
      cobSubmenus.push({name: "UserM", href: "/userm/#/user", fullUrl:"true"})

      const userGroups = core.getGroups();
      const isSystem = userGroups.indexOf("System") >= 0 
      let groupsQuery = userGroups && userGroups.map(g => "\"" + g + "\"").join(" OR ") 
      const currentUserScope = (userGroups.find((grp) => grp.indexOf(SCOPE_ACCESS_PERMISSION_KEYWORD) === 0));
      if(currentUserScope) {
         groupsQuery = groupsQuery.replaceAll(currentUserScope.substring(SCOPE_ACCESS_PERMISSION_KEYWORD.length),"_SCOPE_")
      }
      const dashboardsQuery = isSystem ? "*" : "groupaccess.raw:(" + groupsQuery + ") OR (-groupaccess:*)" 

      if(solutionDashInfo) {
         // If we're not a first call and already have a solutionDashInfo just update the query. call solutionDashInfo handler even if anything changes (worst case it will be called twice, but this way we garanty that it is called at least once)
         solutionDashInfo.changeArgs({query: dashboardsQuery}) 
         solutionDashInfo.changeCB(solutionDashInfo.results)
      } else {            
         // First call: initialize solutionDashInfo and setup it's change handler
         window.cob.app = window.cob.app || { getCurrentLoggedInUser :  core.getCurrentLoggedInUser } //Hack to make cob.app.getCurrentLoggedInUser available to the dashInfo from the start (otherwise it will have to do a query to userm and the next call will be async, not having an answer at t0)
         solutionDashInfo = fieldValues(DASHBOARD_DEF, "solution_menu.raw", dashboardsQuery, 103, { validity: 600, changeCB: (solutions) => {
            // solutionDashInfo changed: customize menu if the user has at least access to one solution
            const numberOfSolutions = solutions && solutions.value && solutions.value.length || 0
            if (numberOfSolutions > 0) {

               // remove all entries that we know we're going to add
               const cleanMenus = currentMenus.filter(v => ["Home", "reports", "rm-importer-stats", "domains", "@", " <"].reduce((pr, x) => pr && v.name.indexOf(x) != 0, true))
               // Remove all domains which name starts with @. By convention they will be placed inside the submenu of their Solution
               const domains = currentMenus.filter(m => m.name.indexOf("@") >= 0 )

               currentMenus.length = 0 //We will re-build completely the menu

               // Show the solution chooser link (make sure there's a "Home" dashboard created for this purpose)
               currentMenus.push({
                  id: "Home",
                  name: " <i class='fa-solid fa-house'></i>",
                  href: "cob.custom-resource/Home/dash"
               });

               // Iterate the different solutions
               const solutionsList = solutions.value.sort((a,b)=>{
                  const aOrder = solutions.hits[a].hits[0].solution_ordem ? solutions.hits[a].hits[0].solution_ordem[0]*1 : 99
                  const bOrder = solutions.hits[b].hits[0].solution_ordem ? solutions.hits[b].hits[0].solution_ordem[0]*1 : 99
                  return aOrder - bOrder
               })
               
               for (let i = 0; i < numberOfSolutions; i++) {
                  const solutionMenuName = solutionsList[i]
                  const icon = solutions.hits[solutionMenuName].hits[0].solution_icon
                  const solutionLabel = " <i class='fa-solid " + icon + "' style='padding-right: 3px;' ></i>" + solutionMenuName
                  const solutionSubmenus = solutions.hits[solutionMenuName].hits.sort((a,b) => (a.order ? a.order[0]*1 : 99) - (b.order ? b.order[0]*1 : 99))
                  const solutionSigla = solutions.hits[solutionMenuName].hits[0].solution_sigla
                  let domainSubmenus = domains.filter(d => d.name.indexOf("@" + solutionSigla) >= 0)

                  const conditionalCobSubmenus = solutionSigla == "COB" ? cobSubmenus : []

                  // Add the entry with the decided link and all the dashboards associated with the solution as submenus
                  currentMenus.push({
                     id: solutionMenuName,
                     name: solutionLabel,
                     href: "cob.custom-resource/" + solutionMenuName + "/dash",
                     html: '<details class="cob-submenu" onclick="cobMenuClick(event)" onmouseenter="cobMenuMouseEnter(event)" onmouseleave="cobMenuMouseLeave(event)">'
                        +  ' <summary data-solution="' + solutionSigla + '">'
                        +  '    <a href="#/cob.custom-resource/' + solutionMenuName + '/dash" >' + solutionLabel + '</a>'
                        +  ' </summary>'
                        +  ' <ul class="dropdown-menu">'
                           + conditionalCobSubmenus.map(s => ''
                           + ' <li>'
                           + '    <a href="' + (s.fullUrl ? '' : '#/') + s.href + '" rel="localize[menu.' + s.rel +  ']">' 
                           +         s.name 
                           + '    </a>'
                           + ' </li>'
                           ).join(" ")
                           + (conditionalCobSubmenus.length ? "<hr style='margin:2px'>" : "")
                           +  solutionSubmenus.map(s => ''
                           + ' <li>'
                           + '    <a href="#/cob.custom-resource/' + s.id + '/dash">' + s.name + '</a>'
                           + ' </li>'
                           ).join(" ")
                           + (domainSubmenus.length ? "<hr style='margin:2px'>" : "")
                           + domainSubmenus.map(s => ''
                           + ' <li>'
                           + '    <a href="#/' + s.href + '" rel="localize[menu.' + s.rel +  ']">' 
                           +         s.name.replace("@"+solutionSigla,"<i class='fa-solid fa-search' ></i>") 
                           + '    </a>'
                           + ' </li>'
                           ).join(" ")
                        +  ' </ul>'
                        + '</details>'
                  })
               }
               if (isSystem) {
                  currentApps.length = 0
                  currentApps.push({name: "Defs", href: "#/domains"});
                  currentApps.push({name: "UserM", href: "/userm/#/user"});
               } 
               currentMenus.push(...cleanMenus); // Restore the legacy stored menu entries removed in the beginning 
               core.publish('updated-app-info');  // Request an update to the built menu
               markActiveSolution()
            }
         }})
      }

      window.addEventListener("cobRefreshMenu", () => {
         if (solutionDashInfo && typeof solutionDashInfo.update === 'function') {
            solutionDashInfo.update({force:true})
         } else {
            setTimeout(() => window.dispatchEvent(new Event("cobRefreshMenu")), 200)
         }
      }) // event listener for requests from the dash app (when lastDash and lastDashSolution changes)
      window.addEventListener('click', function(e) {   // event listener that closes submenus when there's clicks outside that submenu
         var subMenus = [...document.querySelectorAll('.cob-submenu')];
         subMenus.forEach(sm => { if (!sm.contains(e.target)) sm.removeAttribute('open') });
      })
      // event handlers for menus 
      window.cobMenuMouseEnter = function(e) {
         let subMenus = document.querySelectorAll(".cob-submenu");
         subMenus.forEach(sm => { if(!sm.contains(e.target)) sm.removeAttribute('open') });
         let details = e.target.closest("details");
         details.setAttribute("open", "open");
         clearTimeout(details.dataset.timer)
      }
      window.cobMenuMouseLeave = function(e) {
         clearTimeout(e.target.dataset.timer)
         e.target.dataset.timer = setTimeout(function() {
            e.target.removeAttribute("open");
         }, 500);
      }
      // when collapsed close RM submenu window
      window.cobMenuClick = function(e) { 
         document.querySelector(".js-menu-btn.btn.btn-navbar").click()  
      }
   
   })
   setTimeout(() => core.publish('updated-app-info'),1) //Hack to overcome the fact that sometimes the core.customizeMenu is not being called on time

   // -------------------- -------------------- -------------------- -------------------- -------------------- 
   // Mark active Solution on menu  
   window.markActiveSolution = function (e) {
      const extractFirstAtSymbol = (text) => {
         const atIndex = text && text.indexOf('@');
         if (!text || atIndex === -1) return null;

         let extractedWord = '';
         for (let i = atIndex + 1; i < text.length; i++) {
            const char = text.charAt(i);
            // Break loop if whitespace or special characters encountered
            if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '.' || char === ',') {
               break;
            }
            extractedWord += char;
         }
         return extractedWord;
       }

      const activeModule = core.getActiveModule()
      if(activeModule) {
         const instance = activeModule && activeModule.instance
         const description = instance && instance.getDescription && instance.getDescription()

         let solutionSigla
         if(instance.name == "domains"
            || instance.name == "definition.edit"
            || instance.name == "importer-stats" ) {
            solutionSigla = "COB"

         } else if(instance.name == "search-domain") {
            let legacyAwareDescription = description && description.domain ? description.domain.name : description
            solutionSigla = extractFirstAtSymbol(legacyAwareDescription)

         } else if(instance.name == "search-definition" || instance.name == "instance.detail") {
            solutionSigla = extractFirstAtSymbol(description.definition && description.definition.description)

         } else if(instance.name == "custom-resource") {
            let dashboardName = location.hash.substring("#/cob.custom-resource/".length).split("/")[0].split(":")[0]
            solutionSigla = window.cobSolutions && cobSolutions[decodeURI(dashboardName)]
         }

         if(solutionSigla) {
            setTimeout(  () => {
               document.querySelectorAll('summary.activeSolution').forEach(m => m.classList.remove("activeSolution"))
               let menuEntry = document.querySelector('[data-solution="' + solutionSigla + '"]')
               if(menuEntry) menuEntry.classList.add("activeSolution")
               window.dispatchEvent(new CustomEvent("solutionSet", {detail: core}))
            }, 1000)
         }
      } else {
         // If activeModule still not available try again soon
         setTimeout( markActiveSolution, 100)
      }
   }
   // There's no guarantee to when the menu is ready, so set a few updates to be sure
   window.addEventListener("hashchange", () => setTimeout(markActiveSolution,100) )
   window.addEventListener("hashchange", () => setTimeout(markActiveSolution,500) )
   window.addEventListener("hashchange", () => setTimeout(markActiveSolution,1000) )
   window.addEventListener("hashchange", () => setTimeout(markActiveSolution,2000) )

})