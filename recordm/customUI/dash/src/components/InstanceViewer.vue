<template>
  <div class="" :class="instanceClasses">
    <div v-if="!instanceId && !this.instanceDetails" :class="noInstanceClasses">No instance selected</div>

    <div ref="instanceViewer" :class="['cob-app instance-viewer ', {'no-sidenav': hideSidenav}, {'overflow-auto': stopOverflow}, {'!overflow-auto': !stopOverflow}]"></div>
  </div>
</template>

<script>
import ComponentStatePersistence from "@/model/ComponentStatePersistence";
import { EventBus } from "../event-bus"
import { nextTick } from 'vue'
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
    statePersistence: Object,
    isInitialized: false,
    presenterReady: false
  }),
  created() {
    this.statePersistence = new ComponentStatePersistence(this.outputVar, this.activateFromPersistenceChange(this.outputVar))
  },
  mounted() {
    if(this.instanceId) {
      this.showInstance(this.instanceId);
    }
  },
  beforeDestroy() {
    this.statePersistence.stop()
    this.removeFocusListeners()
    if (this.instanceDetails) { 
      this.instanceDetails.destroy() 
    }
    this.isInitialized = false
    this.presenterReady = false
  },
  watch: {
    instanceId: function (newId, oldId) {
      // Only reinitialize if the ID actually changed
      if (newId !== oldId) {
        this.showInstance(newId);
      }
    },
  },
  computed: {
    options() { return this.component["InstanceViewerCustomize"]; },
    vars() { return this.component["vars"]; },
    selectedOptions() {
      if (!this.options[0]) return [];
      if (!this.options[0]["InstanceViewerCustomize"]) return [];
      return this.options[0]["InstanceViewerCustomize"].split("\u0000");
    },

    instanceClasses() { return this.options[0]["InstanceViewerClasses"] || "flex w-full h-full max-h-[70vh]"; },
    noInstanceClasses() { return this.options[0]["NoInstanceClasses"] || "w-full text-center text-xl text-stone-400 font-bold self-center"; },

    instanceId() { return this.component["InstanceViewerInstanceId"] },
    outputVar() { return this.component["InstanceViewerOutputVar"] || '' },
    componentIdentifier() { return this.options[0]["InstanceViewerIdentifier"] || "" },

    hideSidenav() {return this.selectedOptions.indexOf("HideSidenav") !== -1},
    stopOverflow() {return this.selectedOptions.indexOf("StopOverflow") !== -1},
  },
  methods: {
    async setOutputVar(newId) {
      // Set instanceId in output var
      if (this.outputVar) {
        if (!this.statePersistence) {
          console.warn("State persistence not found for filter var name", this.outputVar)
          return
        }
        const finalValue = newId
        this.statePersistence.content = finalValue
        this.$set(this.vars, this.outputVar, newId)
        await nextTick()
      }
    },

    async ensurePresenterReady() {
      if (!this.instanceDetails) {
        return false
      }

      // Wait for presenter to be initialized
      let attempts = 0
      const maxAttempts = 50 // 5 seconds max
      
      while (attempts < maxAttempts) {
        const presenter = this.instanceDetails.getInstanceP()
        if (presenter) {
          this.presenterReady = true
          return true
        }
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      console.warn("Presenter failed to initialize within timeout")
      return false
    },

    setupFocusListeners() {
      if (!this.isInitialized || !this.presenterReady) {
        console.warn("Cannot setup focus listeners - component not fully initialized")
        return
      }

      if (this.instanceDetails) {
        const presenter = this.instanceDetails.getInstanceP()
        if (!presenter) {
          console.warn("Presenter not available for focus listeners")
          return
        }

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

        fps.forEach(fp => {
          const fieldContainer = fp.content()[0]
          const fieldInput = fieldContainer.querySelectorAll("textarea, input")
          fieldInput.forEach(input => {
            if (!input.dataset.focusListenerAdded && input.tabIndex >= 0 && !input.disabled) {
              const fieldDetails = { instancePresenter: presenter, field: fp };
              const focusHandler = (ev) => {
                console.log("DEBUG: InstanceViewer Focus event", input.id);
                let eventDetails = {
                  senderUID: this._uid,
                  componentIdentifier: this.componentIdentifier,
                  detail: fieldDetails
                }
                EventBus.$emit(BUS_FIELD_FOCUS, eventDetails);
              };

              input.addEventListener("focus", focusHandler);
              input.dataset.focusListenerAdded = "true";
              this.focusHandlers[input.id] = focusHandler
            }
          })
        })
      }
    },

    removeFocusListeners() {
      if (!this.instanceDetails) {
        return
      }

      const presenter = this.instanceDetails.getInstanceP()
      if (!presenter) { 
        return
      }

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

      fps.forEach(fp => {
        const fieldContainer = fp.content()[0]
        const fieldInput = fieldContainer.querySelectorAll("textarea, input")
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
    },

    async showInstance(id) {
      // Reset state flags
      this.isInitialized = false
      this.presenterReady = false

      // If no ID, clean up and exit
      if (!id) {
        if (this.instanceDetails) {
          this.removeFocusListeners()
          this.instanceDetails.destroy();
        }
        this.instanceDetails = null
        await this.setOutputVar(null)
        return
      }

      // Remove old listeners before reinitializing
      this.removeFocusListeners()

      // Initialize InstanceDetail
      await this._initInstanceDetail(id)
      this.isInitialized = true

      // Set output var after initialization
      await this.setOutputVar(id)

      // Ensure presenter is ready before setting up listeners
      const presenterReady = await this.ensurePresenterReady()
      
      if (presenterReady) {
        this.setupFocusListeners()
      } else {
        console.error("Failed to initialize presenter for instance:", id)
      }
    },

    async _initInstanceDetail(id) {
      return new Promise((resolve, reject) => {
        if (this.instanceDetails) { 
          this.instanceDetails.destroy() 
        }
        
        this.instanceDetails = new cob.components.InstanceDetail(
          cob.app, 
          { container: $(this.$refs.instanceViewer) }
        )
        
        this.instanceDetails.init(id, undefined, { 
          onDone: () => {
            resolve()
          },
          onError: (error) => {
            console.error("InstanceDetail initialization error:", error)
            reject(error)
          }
        })
      })
    },

    activateFromPersistenceChange(filterVarName) {
      return (newContent) => { 
        this.$set(this.vars, filterVarName, newContent) 
      }
    }
  },
};
</script>

<style>
.instance-viewer {
  position: relative;
  background-color: inherit;
  height: 100%;
}

.instance-viewer .instance-detail-container {
  position: static;
  height: 100%;
}

.instance-viewer .instance-container {
  margin-top: 0% !important;
  padding-top: 10px;
  height: 100%;
}

.instance-viewer .instance-container .content,
.instance-viewer .instance-container .content > div {
  height: 100%;
}

.instance-viewer.no-sidenav .instance-detail-container .sidenav {
  display: none;
}

.instance-viewer .instance-detail-container .instance-container .fields-container {
  position: static;
  height: 100%;
}
</style>