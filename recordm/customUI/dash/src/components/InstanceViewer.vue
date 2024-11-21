<template>
  <div class="flex w-full h-full">
    <div v-if="!instanceId" :class="noInstanceClasses">No instance selected</div>

    <div ref="instanceViewer" class="cob-app instance-viewer  overflow-auto"
      :class="[...instanceClasses, { 'w-full': instanceViewer }]"></div>
  </div>
</template>

<script>
import ComponentStatePersistence from "@/model/ComponentStatePersistence";

export default {
  props: {
    component: Object,
  },
  data: () => ({
    instanceViewer: null,
  }),
  mounted() {
    // Temporary for egv poc
    window.addEventListener("pocDocUpdate", this.handleEvent);

    this.showInstance(this.instanceId);
  },
  beforeDestroy() {
    // Temporary for egv poc
    window.removeEventListener("pocDocUpdate", this.handleEvent);

    if (this.instanceViewer) { this.instanceViewer.destroy(); }
  },
  watch: {
    instanceId: function (newId) {
      this.showInstance(newId);
    },
  },
  computed: {
    options() { return this.component["InstanceViewerCustomize"]; },
    vars() { return this.component["vars"]; },

    instanceClasses() { return this.options["InstanceViewerClasses"] || ""; },
    noInstanceClasses() { return this.options["NoInstanceClasses"] || "w-full text-center text-3xl text-gray-300 font-bold self-center"; },

    instanceId() { return this.component["InstanceViewerInstanceId"]; },
    outputVar() { return this.component["InstanceViewerOutputVar"] || '' }
  },
  methods: {
    showInstance(id) {

      if (!id) {
        if (this.instanceViewer) { this.instanceViewer.destroy(); }
        this.instanceViewer = null;
        return
      }

      if (this.instanceViewer) {
        this.instanceViewer.showInstance(id);
      } else {
        this.instanceViewer = new cob.components.InstanceViewer(cob.app, $(this.$refs.instanceViewer), id, {});
      }

      // Set instanceId in output var
      if (this.outputVar) {
        const statePersistence = new ComponentStatePersistence(this.outputVar, this.activateFromPersistenceChange(this.outputVar))
        if (!statePersistence) {
          console.warn("State persistence not found for filter var name", this.outputVar)
          return
        }
        const finalValue = statePersistence.content !== id ? id : ""
        statePersistence.content = finalValue
        this.$set(this.vars, this.outputVar, id)
      }
    },
    activateFromPersistenceChange(filterVarName) {
      return (newContent) => { this.$set(this.vars, filterVarName, newContent) }
    },
    handleEvent(event) {
      const key = event.detail.key;
      let storedObject = JSON.parse(localStorage.getItem(key));
      this.showInstance(storedObject.id);
    }
  },
};
</script>

<style>
.instance-viewer {
  position: relative;
  background-color: inherit;
}

.instance-viewer .instance-detail-container {
  position: static;
}

.instance-viewer .instance-detail-container .sidenav {
  display: none;
}

.instance-viewer .instance-detail-container .instance-container .fields-container {
  position: static;
}
</style>