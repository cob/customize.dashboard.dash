<template>
  <div :id="'menu' + this._uid" :class="classes">
    <component v-for="(line, i) in lines" :is="line.componentTag" :key="i"
      :class="[line.classes, { 'cursor-pointer': line.clickable }]" :href="line.link || false" :onClick="line.script"
      @click="line.clickHandler">
      <span>
        <i v-if="line.icon" :class="line.icon" style="margin-right:4px"></i>
        <span v-html="line.text"></span>
      </span>
      <Attention class="absolute right-1" :attentionInfo="line.attention" />
    </component>
  </div>
</template>

<script>
import ComponentStatePersistence from "@/model/ComponentStatePersistence";
import Attention from './Attention.vue'

export default {
  components: { Attention },
  props: {
    component: Object
  },
  data: () => ({
    statePersistencesMap: {},
    handleDropRefs: new Map(),
    handleDragOverRefs: new Map()
  }),
  created() {
    this.updatePersistenceMap(this.lines)
  },
  mounted() {
    this.setupDragAndDrop()
  },
  updated() {
    this.setupDragAndDrop()
  },
  beforeUnmount() {
    this.stopListeners()
  },
  watch: {
    lines(newLines) {
      this.updatePersistenceMap(newLines)
    }
  },
  beforeDestroy() {
    Object.keys(this.statePersistencesMap)
      .forEach(key => this.statePersistencesMap[key].stop())
  },
  computed: {
    options() { return this.component['MenuCustomize'][0] },
    classes() { return this.options['MenuClasses'] || "flex flex-col gap-y-2" },
    lines() {
      return this.component['Text'].map(line => {
        let script, componentTag
        let link = line['Link']

        if (link && link.startsWith('javascript:')) {
          componentTag = "button"
          script = link.substring('javascript:'.length)
          link = ""
        } else {
          componentTag = "a"
        }

        const filterVarName = line["FilterVarName"];
        const filterValue = line["FilterValue"];
        const clickHandler = filterVarName ? ((_) => this.activateFromInputChange(filterVarName, filterValue)) : (() => true)

        return {
          classes: line["TextCustomize"][0]['TextClasses'] || "dragItem transition ease-in-out duration-300 rounded-md border border-gray-300 border-l-2 border-l-sky-600 shadow-sm transform hover:translate-x-0.5 p-2 bg-white",
          icon: line["TextCustomize"][0]['Icon'] || "",
          text: line['Text'] || "",
          attention: line["TextCustomize"][0]['AttentionInfo'],
          link: link || "",
          script: script || "",
          componentTag: componentTag || "",
          filterVarName,
          filterValue,
          clickHandler,
          clickable: link || script || filterVarName
        }
      })
    },
  },
  methods: {
    parseDataFields(dataFields) {
      const fieldsObject = {};
      for (const attr of dataFields) {
        if (attr.name.startsWith('data-')) {
          const key = attr.name.slice(5); // Remove "data-" prefix
          fieldsObject[key] = attr.value;
        }
      }
      return fieldsObject;
    },
    handleDropConcurrent(rmId, fields_values, concurrent) {
      axios.post(`/integrationm/concurrent/${concurrent}`,
        fields_values).then(() => {
          ui.notification.showInfo("Pedido Alterado! <br> Clique no refresh para atualizar a página.", false);
        })
    },
    handleDragStart(e) {
      this.component.dashDragContext.draggedItem = e.target;
      this.component.dashDragContext.srcZone = this.component.dashDragContext.draggedItem.parentNode;
      this.component.dashDragContext.srcZonePoint = this.component.dashDragContext.draggedItem.nextElementSibling;
      this.component.dashDragContext.droppedOnZone = false;
      this.component.dashDragContext.draggedItem.classList.add("dragging");
    },
    handleDragEnd(e) {
      this.component.dashDragContext.draggedItem.style.visibility = ""
      this.component.dashDragContext.draggedItem.classList.remove("dragging")
      if (this.component.dashDragContext.droppedOnZone != true) {
        this.putDraggedItemOn(this.component.dashDragContext.srcZone, this.component.dashDragContext.srcZonePoint)
      }
    },
    handleDragOver(e, dropZone) {
      e.preventDefault();
      //this.component.dashDragContext.dstZonePoint = this.getCurrentPoint(dropZone, e.clientY);
      //this.putDraggedItemOn(dropZone,this.component.dashDragContext.dstZonePoint)
    },
    handleDragEnter(e) {
      if (e && e.target && e.target.classList.contains("dropZone")) {
        e.target.classList.add("bg-stone-500")
        this.component.dashDragContext.draggedItem.style.visibility = ""
      }
    },
    handleDragLeave(e) {
      if (e && e.target && !e.fromElement.classList.contains("dragItem")) {
        e.target.classList.remove("bg-stone-500")
      }
    },
    handleDragDrop(e, dropZone) {
      e.preventDefault();
      dropZone.classList.remove("bg-stone-500")
      this.component.dashDragContext.dstZonePoint = this.getCurrentPoint(dropZone, e.clientY);
      this.putDraggedItemOn(dropZone, this.component.dashDragContext.dstZonePoint)
      this.component.dashDragContext.draggedItem.style.visibility = ""
      this.component.dashDragContext.draggedItem.classList.remove("dragging")
      this.component.dashDragContext.droppedOnZone = true;

      let data_attributes = this.parseDataFields(dropZone.attributes)
      this.handleDropConcurrent(data_attributes)
    },
    setupDragAndDrop() {
      const dragItems = document.querySelectorAll(`#menu${this._uid} .dragItem`);
      for (let dragItem of dragItems) {
        // removes dragitem events
        dragItem.removeEventListener("dragstart", this.handleDragStart)
        dragItem.removeEventListener("dragend", this.handleDragEnd)
        // add dragitem events
        dragItem.addEventListener("dragstart", this.handleDragStart);
        dragItem.addEventListener("dragend", this.handleDragEnd);
      }

      /* events fired on the drop targets */
      const dropZones = document.querySelectorAll(`#menu${this._uid} .dropZone, #menu${this._uid}.dropZone`);
      for (let dropZone of dropZones) {
        const boundHandleDragOver = (e) => this.handleDragOver(e, dropZone);
        const boundHandleDragDrop = (e) => this.handleDragDrop(e, dropZone)

        // Remove dropzone events
        dropZone.removeEventListener("dragover", this.handleDragOverRefs.get(dropZone));
        dropZone.removeEventListener("dragenter", this.handleDragEnter);
        dropZone.removeEventListener("dragleave", this.handleDragLeave);

        dropZone.removeEventListener("drop", this.handleDropRefs.get(dropZone));

        // Add dropzone events
        this.handleDragOverRefs.set(dropZone, boundHandleDragOver)
        dropZone.addEventListener("dragover", boundHandleDragOver, false);
        dropZone.addEventListener("dragenter", this.handleDragEnter);
        dropZone.addEventListener("dragleave", this.handleDragLeave);

        this.handleDropRefs.set(dropZone, boundHandleDragDrop);
        dropZone.addEventListener("drop", boundHandleDragDrop);
      }
    },
    stopListeners() {
      const dragItems = document.querySelectorAll(`#menu${this._uid} .dragItem`);
      for (let dragItem of dragItems) {
        dragItem.removeEventListener("dragstart", this.handleDragStart)
        dragItem.removeEventListener("dragend", this.handleDragEnd)
      }

      /* events fired on the drop targets */
      const dropZones = document.querySelectorAll(`#menu${this._uid} .dropZone, #menu${this._uid}.dropZone`);
      for (let dropZone of dropZones) {
        dropZone.removeEventListener("dragover", this.handleDragOverRefs.get(dropZone));
        dropZone.removeEventListener("dragenter", this.handleDragEnter);
        dropZone.removeEventListener("dragleave", this.handleDragLeave);

        dropZone.removeEventListener("drop", this.handleDropRefs.get(dropZone));
      }
    },
    getCurrentPoint(dropZone, y) {
      const draggableElements = [...dropZone.querySelectorAll(".dragItem:not(.dragging)")];
      return draggableElements.reduce((closestElement, element) => {
        const elementBox = element.getBoundingClientRect();
        const offset = y - elementBox.top - elementBox.height / 2;
        if (offset < 0 && offset > closestElement.offset) {
          return { offset: offset, element: element };
        } else {
          return closestElement;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element
    },
    putDraggedItemOn(zone, dstZonePoint) {
      if (dstZonePoint == null) {
        //zone.appendChild(this.component.dashDragContext.draggedItem);
        zone.insertAdjacentElement("beforeend", this.component.dashDragContext.draggedItem);
      } else {
        //zone.insertBefore(this.component.dashDragContext.draggedItem, dstZonePoint);
        dstZonePoint.insertAdjacentElement("beforeend", this.component.dashDragContext.draggedItem);
      }
    },
    updatePersistenceMap(lines) {
      lines.forEach(l => {
        if (!this.statePersistencesMap[l.filterVarName]) {
          this.statePersistencesMap[l.filterVarName] = new ComponentStatePersistence(l.filterVarName, this.activateFromPersistenceChange(l.filterVarName))
        }
      });
    },
    activateFromInputChange(filterVarName, filterValue) {
      const statePersistence = this.statePersistencesMap[filterVarName];
      if (!statePersistence) {
        console.warn("State persistence not found for filter var name", filterVarName)
        return
      }

      const finalValue = statePersistence.content !== filterValue ? filterValue : ""

      statePersistence.content = finalValue
      this.$set(this.component.vars, filterVarName, finalValue)
    },
    activateFromPersistenceChange(filterVarName) {
      return (newContent) => { this.$set(this.component.vars, filterVarName, newContent) }
    },
  }
}
</script>