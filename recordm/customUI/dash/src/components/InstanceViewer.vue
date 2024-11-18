<template>
  <div class="flex w-full h-full">
    <div v-if="!instanceId"
         :class="noInstanceClasses">No instance selected</div>

    <div v-if="instanceId" ref="instanceViewer"
         class="cob-app instance-viewer w-full overflow-auto"
         :class="instanceClasses"></div>
  </div>
</template>

<script>
export default {
  props: {
    component: Object,
  },
  data: () => ({
    instanceViewer: null,
  }),
  mounted() {
    this.showInstance(this.instanceId);
  },
  watch: {
    instanceId: function(newId) {
      this.showInstance(newId);
    },
  },
  computed: {
    options() { return this.component["InstanceViewerCustomize"]; },
    vars() { return this.component["vars"]; },

    instanceClasses() { return this.options["InstanceViewerClasses"] || ""; },
    noInstanceClasses() { return this.options["NoInstanceClasses"] || "w-full text-center text-3xl text-gray-300 font-bold self-center"; },

    inputVar() { return this.component["InstanceIdInputVar"];},
    instanceId() {return this.vars[this.inputVar];},
  },
  methods: {
    showInstance(id) {

      if (!id) {
        this.instanceViewer.destroy();
        this.instanceViewer = null;
        return
      }

      if (this.instanceViewer) {
        this.instanceViewer.showInstance(id);

      } else {
        this.instanceViewer = new cob.components.InstanceViewer(cob.app, $(this.$refs.instanceViewer), id, {});
      }
    },
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