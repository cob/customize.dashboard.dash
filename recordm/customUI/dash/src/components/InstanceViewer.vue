<template>
  <div class="" :class="instanceClasses">
    <div v-if="!instanceId && !this.instanceDetails" :class="noInstanceClasses">No instance selected</div>

    <div ref="instanceViewer" class="cob-app instance-viewer  overflow-auto"></div>
  </div>
</template>

<script>
import ComponentStatePersistence from "@/model/ComponentStatePersistence";
import { EventBus } from "../event-bus"
const BUS_FIELD_FOCUS = "field-focus"

export default {
  props: {
    component: Object,
  },
  data: () => ({
    instanceDetails: null,
    instanceViewer: null,
    fieldDetails: null,
    focusHandlers: {},
    statePersistence: Object
  }),
  created() {
    this.statePersistence = new ComponentStatePersistence(this.outputVar, this.activateFromPersistenceChange(this.outputVar))
  },
  mounted() {
    this.showInstance(this.instanceId);
    if(this.instanceId) {
      this.setOutputVar(this.instanceId);
    }
  },
  beforeDestroy() {
    this.statePersistence.stop()
    this.removeFocusListeners()
    if (this.instanceDetails) { this.instanceDetails.destroy() }
  },
  watch: {
    instanceId: function (newId) {
      if (newId) {
        this.setOutputVar(newId);
      }
      this.showInstance(newId);
    },
  },
  computed: {
    options() { return this.component["InstanceViewerCustomize"]; },
    vars() { return this.component["vars"]; },

    instanceClasses() { return this.options[0]["InstanceViewerClasses"] || "flex w-full h-full max-h-[70vh]"; },
    noInstanceClasses() { return this.options[0]["NoInstanceClasses"] || "w-full text-center text-xl text-stone-400 font-bold self-center"; },

    instanceId() { return this.component["InstanceViewerInstanceId"] },
    outputVar() { return this.component["InstanceViewerOutputVar"] || '' },
    componentIdentifier() { return this.options[0]["InstanceViewerIdentifier"] || "" }
  },
  methods: {
    setOutputVar(newId) {
      // Set instanceId in output var
      if (this.outputVar) {
        if (!this.statePersistence) {
          console.warn("State persistence not found for filter var name", this.outputVar)
          return
        }
        const finalValue = this.statePersistence.content !== newId ? newId : ""
        this.statePersistence.content = finalValue
        this.$set(this.vars, this.outputVar, newId)
      }
    },
    // Turn this into a component option: SendFocusEvents
    setupFocusListeners() {
      if (this.instanceDetails) {
        const presenter = this.instanceDetails.getInstanceP()

        let fps = presenter.findFieldPs(fp => {
          if (fp && fp.field && fp.field.fieldDefinition && fp.field.fieldDefinition.description) {
            let description = fp.field.fieldDefinition.description;
            if (description.includes("readonly") || description.includes("group")) {
              return false
            }
            return true
          }
          return true
        });

        // Iterate groups and their child fields - the ones we want to "fill" with ocr
        fps.forEach(fp => {
          const fieldContainer = fp.content()[0]
          const fieldInput = fieldContainer.querySelectorAll("textarea, input") // get textareas and inputs
          fieldInput.forEach(input => {
            if (!input.dataset.focusListenerAdded) {
              const fieldDetails = { instancePresenter: presenter, field: fp };
              const focusHandler = (ev) => {
                console.log("DEBUG: InstanceViewer Focus event 1", input.id);
                let eventDetails = {
                  senderUID: this._uid,
                  componentIdentifier: this.componentIdentifier,
                  detail: fieldDetails
                }
                EventBus.$emit(BUS_FIELD_FOCUS, eventDetails);
              };

              input.addEventListener("focus", focusHandler);
              input.dataset.focusListenerAdded = "true";
              this.focusHandlers[input.id] = focusHandler // Store the handler for later removal
            }
          })
        })
      }
    },
    removeFocusListeners() {
      if (this.instanceDetails) {
        const presenter = this.instanceDetails.getInstanceP()
        if (!presenter) { return; }
        let fps = presenter.findFieldPs(fp => {
          if (fp && fp.field && fp.field.fieldDefinition && fp.field.fieldDefinition.description) {
            let description = fp.field.fieldDefinition.description;
            if (description.includes("readonly") || description.includes("group")) {
              return false
            }
            return true
          }
          return true
        });

        // Iterate groups and their child fields - the ones we want to "fill" with ocr
        fps.forEach(fp => {
          const fieldContainer = fp.content()[0]
          const fieldInput = fieldContainer.querySelectorAll("textarea, input") // get textareas and inputs
          fieldInput.forEach(input => {
            if (input.dataset.focusListenerAdded || input.dataset.focusListenerAdded === "true") {
              const focusHandler = this.focusHandlers[input.id]
              if (focusHandler) {
                input.removeEventListener("focus", focusHandler);
                delete input.dataset.focusListenerAdded;
                delete this.focusHandlers[input.id]
              }
            }
          })
        })
      }
    },
    async showInstance(id) {
      if (!id) {
        if (this.instanceDetails) {
          this.removeFocusListeners()
          this.instanceDetails.destroy();
        }
        this.instanceDetails = null
        return
      }

      this.removeFocusListeners()
      await this._initInstanceDetail(id)
      this.setupFocusListeners()
    },
    async _initInstanceDetail(id) {
      return new Promise((resolve) => {
        if (this.instanceDetails) { this.instanceDetails.destroy() }
        this.instanceDetails = new cob.components.InstanceDetail(cob.app, { container: $(this.$refs.instanceViewer) })
        this.instanceDetails.init(id, undefined, { onDone: resolve })
      })
    },
    activateFromPersistenceChange(filterVarName) {
      return (newContent) => { this.$set(this.vars, filterVarName, newContent) }
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