import Vue from "vue";
import App from "./App.vue";

Vue.config.productionTip = false;

console.debug("DASHMAIN: Creating vue for the dashboard");
let vueApp = new Vue({
    render: function(h) { return h(App); },
}).$mount("#app");

function getDashName() {
    const dashParts = window.location.hash.split("/")
    return dashParts[dashParts.length - 1].split("?")[0]
}

const initialDashName = getDashName()
let dashActive = true

function onHashChange() {
    const currentDashName = getDashName()
    if (currentDashName !== initialDashName && dashActive ) {
        console.debug("DASHMAIN: Leaving the initialDashName=",initialDashName," for currentDashName=",currentDashName,". Destroying the dashboard");
        vueApp.$destroy();
        dashActive = false
    } 
    if (currentDashName === initialDashName && !dashActive ) {
        dashActive = true
        console.debug("DASHMAIN: Re-Creating vue for the dashboard");
        vueApp = new Vue({
            render: function(h) { return h(App); },
        }).$mount("#app");        
    }
}

window.addEventListener("hashchange", onHashChange);