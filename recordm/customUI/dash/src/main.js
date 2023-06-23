import Vue from "vue";
import App from "./App.vue";

Vue.config.productionTip = false;

debugger
if(typeof(window.dashActive) == 'undefined') {
    window.dashActive = false
}

let vueApp
if (!window.dashActive) {
    console.debug("DASHMAIN: Creating vue for the dashboard");
    vueApp = new Vue({
        render: function(h) { return h(App); },
    }).$mount("#app");
    window.dashActive = true
} else {
    console.debug("DASHMAIN: Not creating vue for the dashboard (will be done by the handler)"); 
}

function getDashName() {
    const dashParts = window.location.hash.split("/")
    return dashParts[dashParts.length - 1].split("?")[0]
}

const initialDashName = getDashName()


function onHashChange() {
    const currentDashName = getDashName()
    if (currentDashName !== initialDashName && window.dashActive ) {
        console.debug("DASHMAIN: Leaving the initialDashName=",initialDashName," for currentDashName=",currentDashName,". Destroying the dashboard");
        vueApp.$destroy();
        window.dashActive = false
    } else if (currentDashName === initialDashName && !window.dashActive) {
        if(document.getElementById("app")) {
            console.debug("DASHMAIN: Re-Creating vue for the dashboard");
            vueApp = new Vue({
                render: function(h) { return h(App); },
            }).$mount("#app"); 

        } else {
            console.debug("DASHMAIN: #app not ready. Wait a little ");
            var div = document.createElement("div");
            document.getElementById("dash").appendChild(div);                   
            setTimeout( onHashChange, 100 )
        }
    }
}

window.addEventListener("hashchange", onHashChange);