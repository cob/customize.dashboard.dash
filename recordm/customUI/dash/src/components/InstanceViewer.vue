<template>
  <div class="flex w-full h-full max-h-[70vh]">
    <div v-if="!instanceId && !this.instanceViewer" :class="noInstanceClasses">No instance selected</div>

    <div ref="instanceViewer" class="cob-app instance-viewer  overflow-auto"
      :class="[...instanceClasses, { 'w-full': instanceViewer }]"></div>
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
    instanceViewer: null,
    fieldDetails: null,
    focusHandlers: {}
  }),
  mounted() {
    // Temporary for egv poc
    window.addEventListener("pocDocUpdate", this.handleEvent);

    this.showInstance(this.instanceId);
  },
  beforeDestroy() {
    // Temporary for egv poc
    window.removeEventListener("pocDocUpdate", this.handleEvent);

    this.removeFocusListeners()
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
    noInstanceClasses() { return this.options["NoInstanceClasses"] || "w-full text-center text-xl text-stone-400 font-bold self-center"; },

    instanceId() { return this.component["InstanceViewerInstanceId"] },
    outputVar() { return this.component["InstanceViewerOutputVar"] || '' },
    componentIdentifier() { return this.options[0]["InstanceViewerIdentifier"] || "" }
  },
  methods: {
    // Turn this into a component option: SendFocusEvents
    setupFocusListeners() {
      if (this.instanceViewer) {
        const presenter = this.instanceViewer.getInstanceP()

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
      if (this.instanceViewer) {
        const presenter = this.instanceViewer.getInstanceP()
        if(!presenter) { return; }
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
        if (this.instanceViewer) { 
          this.removeFocusListeners()
          this.instanceViewer.destroy();
        }
        this.instanceViewer = null;
        return
      }

      this.removeFocusListeners()
      if (this.instanceViewer) {
        await this.instanceViewer.showInstance(id);
      } else {
        this.instanceViewer = new cob.components.InstanceViewer(cob.app, $(this.$refs.instanceViewer), {});
        await this.instanceViewer.showInstance(id)
      }
      this.removeFocusListeners()
      this.setupFocusListeners()


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