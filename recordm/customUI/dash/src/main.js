import Vue from "vue";
import App from "./App.vue";

window.CoBDasHDebug = window.CoBDasHDebug || {}
const DEBUG = window.CoBDasHDebug
Vue.config.productionTip = true;

function getDashName() {
    const dashParts = window.location.hash.split("/")
    return dashParts[dashParts.length - 1].split("?")[0]
}

const initialDashName = getDashName()

if(DEBUG.main) console.log("DASH: MAIN: 0: Creating vue for the dashboard");
const vueApp = new Vue({
    render: function(h) { return h(App); },
}).$mount("#app");

function onHashChange() {
    const currentDashName = getDashName()
    if (currentDashName !== initialDashName) {
        if(DEBUG.main) console.log("DASH: MAIN: 9: Leaving the initialDashName=",initialDashName," for currentDashName=",currentDashName,". Destroying the dashboard");
        vueApp.$destroy();
        window.removeEventListener("hashchange", onHashChange);
    }
}

window.addEventListener("hashchange", onHashChange);