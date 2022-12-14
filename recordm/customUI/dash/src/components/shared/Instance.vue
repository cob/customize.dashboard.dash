<template>
  <div class='flex flex-col p-4 rounded border-2 border-zinc-300 bg-zinc-50 calendar-tooltip'>
    <a :href='instanceUrl' class='max-w-fit mb-4 text-sky-500 uppercase no-underline hover:underline js-instance-label main-info'>
      {{ instanceLabel }}
    </a>
    <div class='details flex flex-col flex-wrap justify-start'>
      <div class='flex flex-row mr-4 field-group max-w-xs'
           v-for='(description,i) in instanceDescriptions' 
           :key="i" 
      >
        <div class='whitespace-nowrap mr-1 text-gray-400 field'>{{ description.name }}:</div>
        <div class='whitespace-nowrap text-ellipsis overflow-hidden value' v-html="description.value"></div>
      </div>
    </div>
  </div>
</template>

<script>
import {toEsFieldName} from "@cob/rest-api-wrapper/src/utils/ESHelper";
import {getValue} from "@/utils/EsInstanceUtils";

export default {
  props: {
    esInstance: Object
  },

  computed: {
    instanceUrl() {
      return `#/instance/${this.esInstance.id}`
    },

    instanceLabel() {
      if (!this.esInstance._definitionInfo.instanceLabel || !this.esInstance._definitionInfo.instanceLabel.length) {
        return this.esInstance.id
      } else {
        const fieldDefinition = this.esInstance._definitionInfo.instanceLabel[0];
        return getValue(this.esInstance, fieldDefinition)[0]
      }
    },

    instanceDescriptions() {
      if (!this.esInstance._definitionInfo.instanceDescription) {
        return null

      } else {
        return this.esInstance._definitionInfo.instanceDescription
            .filter(fieldDefinition => this.esInstance[toEsFieldName(fieldDefinition.name)])
            .map(fieldDefinition => {
              let value = getValue(this.esInstance, fieldDefinition).join(', ')
              if (fieldDefinition.description.indexOf("$datetime") >= 0) {
                let dt = (new Date(value * 1)).toISOString()
                value = dt.split('T')[0] + " " + dt.split('T')[1].substring(0, 5)
              } else if (fieldDefinition.description.indexOf("$date") >= 0) {
                value = (new Date(value * 1)).toISOString().split('T')[0]
              } else if (fieldDefinition.description.indexOf("$link") >= 0) {
                value = "<a href='" + getValue(this.esInstance, fieldDefinition) + "'>link</a>"
              }
              return {
                name: fieldDefinition.name,
                value: value
              }
            });
      }
    },
  }
}
</script>