import Vue from "vue";
import App from "./App.vue";

window.CoBDasHDebug = window.CoBDasHDebug || {}
const DEBUG = window.CoBDasHDebug
// window.CoBDasHDebug.main = true

Vue.config.productionTip = true;

if(DEBUG.main) console.log("DASH: MAIN: 0 location.hash=" + window.location.hash);

function getDashName() {
    const dashParts = window.location.hash.split("/")
    return dashParts[dashParts.length - 1].split("?")[0]
}
const initialDashName = getDashName()

window.cobDashAppLoaded = typeof(window.cobDashAppLoaded) !== "undefine" ? window.cobDashAppLoaded : false

let vueApp
function loadVueApp(origin) {
    if(DEBUG.main) console.log("DASH: MAIN: " + origin + ".0: Evaluationg creating vue for the dashboard");
    if(!window.cobDashAppLoaded) {
        const newcobDashAppDiv = document.createElement("div");
        newcobDashAppDiv.id = "cobDashApp"

        let cobDashApp = document.getElementById("cobDashApp")
        if(cobDashApp) {
            if(document.getElementById("cobDashApp").innerHTML !== "") {
                if(DEBUG.main) console.log("DASH: MAIN: " + origin + ".1: rename old div for smooth transition");
                cobDashApp.id = "cobDashAppOld"
                cobDashApp.position = "relative"
                const overlay = document.createElement("div");
                overlay.style.backgroundColor = "#DDD2"
                overlay.style.position = "absolute"
                overlay.style.top = "0"
                overlay.style.bottom = "0"
                overlay.style.right = "0"
                overlay.style.left = "0"
                cobDashApp.append(overlay)
                cobDashApp.after(newcobDashAppDiv);
            }
        } else {
            if(DEBUG.main) console.log("DASH: MAIN: " + origin + ".1: create absent div #cobDashApp ");
            // Este caso acontece quando fazemos Back de uma página RM para um dashboards que já tinha sido instânciado. Há uma corrida entre o eventHandler e a construção da página pelo RM
            // Há circunstâncias em que o RM opta por apagar o conteúdo da section.custom-resource e nesses casos temos de recriar a div de entrada
            document.querySelector("section.custom-resource").append(newcobDashAppDiv)
        }
        
        vueApp = new Vue({
            render: function(h) { return h(App); },
        }).$mount("#cobDashApp");
        window.cobDashAppLoaded = true
        if(DEBUG.main) console.log("DASH: MAIN: " + origin + ".3: done");
    } else {
        if(DEBUG.main) console.log("DASH: MAIN: " + origin + ".4: not necessary");
    }
}

function onHashChange() {
    const currentDashName = getDashName()

    if (currentDashName !== initialDashName && window.cobDashAppLoaded) {
        if(DEBUG.main) console.log("DASH: MAIN: 9: Leaving the initialDashName=",initialDashName," for currentDashName=",currentDashName,". Destroying the dashboard");
        vueApp.$destroy();
        cobDashAppLoaded = false
    } 
    
    if (currentDashName === initialDashName && !window.cobDashAppLoaded) {
        if(DEBUG.main) console.log("DASH: MAIN: 2: Schedule request for recreating vue for the dashboard");
        // Para isto funcionar o elemento topo do dash tem de ter o mesmo id que o src/dashboard.html 
        loadVueApp("2")
    }
}

if(!window.cobDashAppLoaded) {
    if(DEBUG.main) console.log("DASH: MAIN: 1: Request creating vue for the dashboard");
    window.addEventListener("hashchange", onHashChange);
    loadVueApp("1")
    
} else if( !document.getElementById("cobDashApp") || document.getElementById("cobDashApp").innerHTML == "") {
    if(DEBUG.main) console.log("DASH: MAIN: 3: Re - re - creating vue for the dashboard");
    // Este caso mais raro acontece quando o HashChange handler responde primeiro, começa a construir a App mas o RM depois apaga a div e reconstroi o custom-resource, voltando a chanar o main.js
    window.cobDashAppLoaded = false
    loadVueApp("3")
}