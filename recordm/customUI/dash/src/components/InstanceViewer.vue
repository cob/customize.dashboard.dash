<template>
  <section ref="instanceViewer" class="cob-app"></section>
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
    this.showInstance(this);
  },
  watch: {
    inputVar() { this.showInstance(this.inputVar); },
  },
  computed: {
    options() { return this.component["InstanceViewerCustomize"]; },
    classes() { return this.options["InstanceViewerClasses"] || "$text $default(text-justify text-gray-700) Default: text-justify text-gray-700 "; },
    inputVar() { return this.options["InstanceIdInputVar"];},
  },
  methods: {
    showInstance(instanceId) {
      if (!instanceId) return;

      if (this.instanceViewer) {
        this.instanceViewer.showInstance(instanceId);

      } else {
        this.instanceViewer = new cob.components.InstanceViewer(cob.app, this.$refs.instanceViewer, this.inputVar, {});
      }
    },
  },
};
</script>