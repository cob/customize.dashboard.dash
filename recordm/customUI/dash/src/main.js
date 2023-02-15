import Vue from "vue";
import App from "./App.vue";
import "./output.css";
import "./assets/css/all.min.css";

Vue.config.productionTip = false;

let vueApp = new Vue({
    render: function(h) { return h(App); },
}).$mount("#app");

function getDashName() {
    const dashParts = window.location.hash.split("/")
    return dashParts[dashParts.length - 1].split("?")[0]
}

const dashName = getDashName()

function onHashChange() {
    const currentDashName = getDashName()
    if (currentDashName !== dashName) {
        console.debug("Leaving the dashboard. Destroying the dashboard");
        vueApp.$destroy();
        window.removeEventListener("hashchange", onHashChange, true);
    }
}

window.addEventListener("hashchange", onHashChange, true);