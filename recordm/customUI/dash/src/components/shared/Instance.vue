<template>
  <div class='flex flex-col p-4 rounded border-2 border-zinc-300 bg-zinc-50 calendar-tooltip'>
    <a :href='instanceUrl' class='max-w-fit mb-4 text-sky-500 uppercase no-underline hover:underline js-instance-label main-info'>
      {{ instanceLabel }}
    </a>
    <div class='details flex flex-col overflow-y-scroll pb-2 flex-wrap justify-start'>
      <div class='flex flex-row mr-4 field-group'
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
      const instanceLabelInfo = this.esInstance._definitionInfo.instanceLabel;
      if (!instanceLabelInfo || !instanceLabelInfo.length) {
        return this.esInstance.id
      } 

      const fieldDefinition = instanceLabelInfo[0];
      let instanceLabelValue = getValue(this.esInstance, fieldDefinition)
      return instanceLabelValue ? instanceLabelValue[0] : this.esInstance.id;
    },

    instanceDescriptions() {
      if (!this.esInstance._definitionInfo.instanceDescription) {
        return null

      } else {
        let objects = this.esInstance._definitionInfo.instanceDescription
          .filter(fieldDefinition => this.esInstance[toEsFieldName(fieldDefinition.name)])
          .map(fieldDefinition => {
            let value = getValue(this.esInstance, fieldDefinition).join(', ')
            if (fieldDefinition.description.indexOf("$datetime") >= 0) {
              value = cob.utils.time.getLocalDateTimeFromTimeStamp(value * 1, cob.app.getLocale());

            } else if (fieldDefinition.description.indexOf("$date") >= 0) {
              value = cob.utils.time.getLocalDateFromTimeStamp(value * 1, cob.app.getLocale());

            } else if (fieldDefinition.description.indexOf("$link") >= 0) {
              value = "<a href='" + getValue(this.esInstance, fieldDefinition) + "'>link</a>"
            }
            return JSON.stringify({
              name: fieldDefinition.name,
              value: value
            })
          });

        return [...new Set(objects)].map(el => JSON.parse(el));
      }
    },
  }
}
</script>