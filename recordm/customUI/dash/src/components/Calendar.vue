<template>
  <div :class='["relative", classes]'>

    <Waiting :active='updatingFlag || debouncing' :interactable='debouncing'/>

    <div>
      <div class='mb-4 text-center text-4xl'>{{ monthTitle }} {{ yearTitle }}</div>
      <FullCalendar ref='fullCalendar' :options='calendarOptions'> 
        <template #eventContent='arg' v-if="usesHandlebars">
          <div class="overflow-x-hidden w-full" v-html="arg.event.title" v-if="arg.event.extendedProps.useCustom"/>
          <CalendarDayEvent :event="arg" :color="arg.backgroundColor" v-else/>
        </template>
      </FullCalendar>
    </div> 
  </div>
</template>

<script>
  import FullCalendar from '@fullcalendar/vue'
  import dayGridPlugin from '@fullcalendar/daygrid'
  import multiMonthPlugin from '@fullcalendar/multimonth'
  import interactionPlugin from '@fullcalendar/interaction'
  import listPlugin from '@fullcalendar/list'
  import allLocales from '@fullcalendar/core/locales-all';
  import {instancesList} from '@cob/dashboard-info';
  import Waiting from './shared/Waiting.vue'
  import debounce from 'lodash.debounce';
  import {toEsFieldName} from '@cob/rest-api-wrapper/src/utils/ESHelper';
  import rmListDefinitions from '@cob/rest-api-wrapper/src/rmListDefinitions';
  import tippy from 'tippy.js';
  import Instance from "@/components/shared/Instance";
  import Vue from "vue";
  import ComponentStatePersistence from "@/model/ComponentStatePersistence";
  import Handlebars from 'handlebars'
  import CalendarDayEvent from './CalendarDayEvent.vue'

  const DEFAULT_EVENT_COLOR = '#0e7bbe'
  const MAX_VISIBLE_DAY_EVENTS = 3

  export default {
    components: {
      FullCalendar,
      Waiting,
      CalendarDayEvent
    },

    props: {
      component: Object
    },

    data: () => ({
      rmEventSources: [], // Array with a DashInfo(...) for each event source spec
      createDefinitionId: null,

      monthTitle: null,
      yearTitle: null,
      dateRange: null, // array: [initDate, endDate]

      calendarApi: null,
      debouncing: false,
      calendarOptions: {
        plugins: [dayGridPlugin, interactionPlugin, listPlugin,multiMonthPlugin],
        timeZone: 'local',
        locales: allLocales,
        locale: navigator.language,
        // Take in consideration updating the initial state value of `activeView` if you change this value
        initialView: 'dayGridWeek',
        headerToolbar: {
          left: 'today prev next',
          center: '',
          right: 'dayGridWeek,dayGridMonth,listMonth,multiMonthYear'
        },
        height: 'auto',
        contentHeight: 'auto',
        aspectRatio: 2,
        validRange: {
          start: '1970-01-01'
        },
        noEventsContent: {html: '<div>&nbsp;</div>'}
      },

      // Need the debouncer to delay the change of the calendar option to make a day selectable because it's impossible
      // to know if there is a tooltip open.
      lazyCalendarConfigurer: debounce((calendarApi, enable) => calendarApi.setOption('selectable', enable), 500),

      statePersistence: Object,
    }),

    created() {
        this.calendarOptions.initialView = this.eventView[0]
        this.calendarOptions.headerToolbar.right = this.eventView.join(",")

        this.statePersistence = new ComponentStatePersistence(this.component.id, this.updateCalendarBasedOnPersistedStateChange)

        // If configured get the definition id to allow instance creation
        if(this.createDefinition) {
          rmListDefinitions({name: this.createDefinition, includeDisabled: true})
          .then( definitions => {
            if (definitions.length) {
              this.createDefinitionId = definitions[0].id
            } else {
              cob.ui.notification.showError(`Unable to find definition ${this.definition}`)
            }
          })
        }
    },

    mounted() {
      // Now that we have DOM finish calendar configuration
      const calendarApi = this.$refs.fullCalendar.getApi()
      this.calendarApi = calendarApi
      this.initialDate = calendarApi.getDate()

      calendarApi.setOption('dayMaxEvents', this.dayMaxEvents === -1 ? false : this.dayMaxEvents)
      calendarApi.setOption('locale', navigator.language ? navigator.languages[0] : undefined )
      calendarApi.setOption('selectMinDistance', !this.endDateField ? 1 : 0) //only allow to select on day if no end date field is available
      calendarApi.setOption('selectable', this.allowCreateInstances)
      calendarApi.setOption('select', this.redirectToNewInstance)
      calendarApi.setOption('viewDidMount', this.updatePersistedStateBasedOnCalendarChange)

      calendarApi.setOption('eventDidMount', (arg) => {
        if (arg.event.extendedProps.hasBG){
            // we don't put the background on saturdays and sundays as this 
            // feture was originally made to represent holidays
            $(arg.el).parents(":not(.fc-day-sat,.fc-day-sun) > .fc-daygrid-day-frame")
                .css("background-color", arg.event.backgroundColor)

            // In list view, it places the background on the list item of the event
            if(arg.el.classList.contains("fc-list-event"))
                $(arg.el).css("background-color", arg.event.backgroundColor)
        }
    })

      const lazyEventsLoader = debounce((dateInfo) => {
        this.debouncing = false
        this.updatePersistedStateBasedOnCalendarChange()
        this.dateRange = [dateInfo.start, dateInfo.end]
      }, 800)

      calendarApi.setOption('datesSet', (dateInfo) => {
        // Reflect immediately the change in the title and set 'debouncing' to 'true' to signal change in progress
        const currentDate = calendarApi.getDate()
        this.monthTitle = currentDate.toLocaleString(navigator.language, {month: 'long'});
        this.yearTitle = currentDate.getFullYear()
        this.debouncing = true

        // 'debounce' loading the events (ie, wait for some user inactivity)
        lazyEventsLoader(dateInfo)
      })

      calendarApi.setOption('eventClick', (eventClickInfo) => {
        // Check if there is already a tooltip instance associated to the element
        // if not let's create one,
        if (!eventClickInfo.el._tippy) {
          // When list view is active I have to look for a different tooltip anchor
          let listViewActive = eventClickInfo.view.type.match(/list.*/)
          const element = listViewActive
                          ? eventClickInfo.el.getElementsByClassName('fc-list-event-title')[0].children[0]
                          : eventClickInfo.el
          // tippy will handle hide and show of existing tooltips. We just need to trigger the show
          this.buildTooltipInstance(element, eventClickInfo.event.extendedProps.esInstance, listViewActive).show()
        }
      })
    },

    beforeDestroy() {
      this.statePersistence.stop()
      for (var i=0; i < this.rmEventSources.length; i++) {
        this.rmEventSources[i].stopUpdates()
      }
    },

    computed: {
      // Customizations component model
      options()              { return this.component['CalendarCustomize'][0] },
      classes()              { return this.options['CalendarClasses'] || 'p-4' },
      inputVarCalendar()     { return this.options['InputVarCalendar'] || [] },
      allowCreateInstances() { return this.options['AllowCreateInstances'] === 'TRUE' || false},
      createDefinition()     { return this.options['CreateDefinition'] },
      eventView()            { return this.options['EventViews'] && this.options['EventViews'].split(',') || ['dayGridWeek','dayGridMonth','listMonth'] },
      outputVar()            { return this.options['OutputVarCalendar'] || '' },
      dayMaxEvents()         { return parseInt(this.options['MaxVisibleDayEvents'], 10) || MAX_VISIBLE_DAY_EVENTS },
      cropMonth()            { return this.options['CalendarCustomize']!=null && this.options['CalendarCustomize'].split("\u0000").indexOf("CropMonth") !== -1},
      // strictMode()           {return this.options['StrictMode'] === 'TRUE' || false},

      // Calendar component model
      eventSources()         { return this.component['Events'] },

      // Behavior component model
      updatingFlag()         { return this.eventSources.map(source => source.state == "loading" || source.state == "updating" ).reduce( (acc,v) => acc || v, false) }, //True if any source is loading|updating

      queries() {
        let queries = []
        
        if (this.dateRange) { // Only calculate queries after having a dateRange set by the calendar
          let startDate = this.dateRange[0].getTime()
          let endDate = this.dateRange[1].getTime()

          if(this.cropMonth) {
            let start = new Date(this.dateRange[0])
            if(start.getDate() > 1){
              start.setDate(1)
              start.setMonth( start.getMonth() + 1)
              start.setHours(0)
              start.setMinutes(0)
              start.setSeconds(0)
            }
            // last day of the month
            let end = new Date(start) 
            end.setMonth( start.getMonth() + 1)
            end.setDate(0) 
            end.setHours(23)
            end.setMinutes(59)
            end.setSeconds(59)

            startDate = start.getTime()
            endDate = end.getTime()
          }
          // if ("dayGridMonth" === this.calendarApi.view.type && this.strictMode){ //check if the grid view is dayMonthGridView
          //   startDate = new Date(this.calendarApi.getDate()).getTime()
          //   endDate = new Date(this.calendarApi.getDate().getFullYear(),this.calendarApi.getDate().getMonth()+1,1).getTime()
          // }
          
          for(let i in this.eventSources) {  
            // Calculate date range query part
            let startField = toEsFieldName(this.eventSources[i]['DateStartEventField'])
            let endField   = toEsFieldName(this.eventSources[i]['DateEndEventField'])
            let dateRangeQuery = `${startField}:[${startDate} TO ${endDate-1}]`
            if (endField) {
              dateRangeQuery += ` OR ${endField}:[${startDate+1} TO ${endDate-1}]`
              dateRangeQuery += ` OR (${startField}:<${startDate} AND ${endField}:>=${endDate-1})`
            }
            dateRangeQuery = `(${dateRangeQuery})`

            // Calculate final query
            const eventQuery = this.eventSources[i]['EventsQuery'] || '*'
            const baseQuery = `${eventQuery} AND (${dateRangeQuery})`
            const inputVars = new Set(this.inputVarCalendar.map(inputVar => inputVar['InputVarCalendar']));
            const finalQuery = `${baseQuery} ${[...inputVars].map(inputVar => this.component.vars[inputVar]).join(' ')}`.trim()

            queries.push(finalQuery)

            // If set, the 'outputVar' should be a query reflecting the current date range displayed on the calendar. Since we can use only one date_field for the query we opt to use the first(0) "Event Source" specs
            if (i==0 && this.outputVar) this.$set(this.component.vars, this.outputVar, dateRangeQuery)
          }
        }
        return queries
      },

      allResults() {
        let results = []
        for (var i=0; i<this.rmEventSources.length;i++) {
          const rmEventSource = this.rmEventSources[i]
          if (rmEventSource.results && rmEventSource.results.value) {
            for(let result of rmEventSource.results.value) {
              const descritpionIsHandlebars = this.isHandlebars(this.eventSources[i]['DescriptionEventField'])
              const description = this.eventSources[i]['DescriptionEventField']

              result["DESCRIPTION FIELD"] = descritpionIsHandlebars ? description : toEsFieldName(description)
              result["STATE FIELD"]       = toEsFieldName(this.eventSources[i]['StateEventField'])
              result["START DATE FIELD"]  = toEsFieldName(this.eventSources[i]['DateStartEventField'])
              result["END DATE FIELD"]    = toEsFieldName(this.eventSources[i]['DateEndEventField'])
              result["TOOLTIP TEMPLATE"]  = this.eventSources[i]['TooltipTemplate']
              result["DESC IS HANDLEBARS"]= descritpionIsHandlebars
              result["IS ALL DAY"] = this.eventSources[i]['AllDay']
              results.push(result)
            }
          }
        }
        return results
      },
    usesHandlebars() { return this.eventSources.some( i => this.isHandlebars(i['DescriptionEventField']))}
    },

    watch: {
      queries: function(newQueries) {
        this.calendarApi.setOption('noEventsContent', {html: '<div>&nbsp;</div>'})
        for (var i=0; i<newQueries.length; i++) {
          if( i < this.rmEventSources.length ) {
            this.rmEventSources[i].changeArgs({query: newQueries[i]})
          } else {
            this.rmEventSources.push( instancesList( this.eventSources[i]['Definition'], newQueries[i], 800, 0, "", {validity: 60}) )              
          }
        }
      },
      
      allResults: function(esInstances) {
        const newCalendarEvents = this.buildCalendarEvents(esInstances)
        const calendarApi = this.calendarApi

        calendarApi.batchRendering(() => {
          calendarApi.getEvents().forEach(event => event.remove())
          newCalendarEvents.forEach(event => calendarApi.addEvent(event))
        })

        if (esInstances.length === 0) {
          this.calendarApi.setOption('noEventsContent', {html: '<div>No events to display</div>'})
        }
      },
    },

    methods: {
      isHandlebars(text) { return text.includes("{|{") },
      updateCalendarBasedOnPersistedStateChange(newContent = {}) {
        if(!this.calendarApi) {
          setTimeout(() => this.updateCalendarBasedOnPersistedStateChange(newContent),100)
        } else {
          this.calendarApi.gotoDate(newContent.initialDate ? newContent.initialDate : this.initialDate )
          this.calendarApi.changeView(newContent.activeView ? newContent.activeView : this.calendarOptions.initialView )
        }
      },

      updatePersistedStateBasedOnCalendarChange() {
        const activeView = this.calendarApi.view.type
        const currentDate = this.calendarApi.getDate()
        const newState = { }
        if(JSON.stringify(currentDate) !== JSON.stringify(this.initialDate)) newState.initialDate = currentDate.dateFormat("Y-m-d")
        if(activeView !== this.calendarOptions.initialView) newState.activeView = activeView
        if(newState.initialDate || newState.activeView ) this.statePersistence.content = newState
      },

      isSingleDay(start, end) {
          const start_date = new Date(start);
          start_date.setDate(start_date.getDate() + 1)
          const end_date = new Date(end); 
          return start_date.getDate() == end_date.getDate() &&
                 start_date.getMonth() == end_date.getMonth() &&
                 start_date.getFullYear() == end_date.getFullYear()
        },         

      buildCalendarEvents(instances) {
        return instances
            .map(esInstance => {
              const startDateField        = esInstance["START DATE FIELD"]
              const endDateField          = esInstance["END DATE FIELD"]
              const descriptionEventField = esInstance["DESCRIPTION FIELD"]
              const stateField            = esInstance["STATE FIELD"]
              const is_all_day = esInstance["IS ALL DAY"].toLowerCase() === "true"
              let instance_all_day = is_all_day

              const startDate = parseInt(esInstance[startDateField][0], 10)

              let endDate = null;
              if (endDateField) {
                if (endDateField !== startDateField && esInstance[endDateField]) {
                  endDate = parseInt(esInstance[endDateField][0], 10);

                } else if (endDateField === startDateField) {
                  endDate = startDate + 1000;
                }
              }

              let hasBG = false
            const toShortString = (date) => `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`

              // useful for handlebars
              esInstance["_is_single_day"] = this.isSingleDay(startDate, endDate)
              esInstance["_start_date_string"] = toShortString(new Date(startDate))
              esInstance["_end_date_string"] = toShortString(new Date(endDate))

              let color


              if (stateField) {
                let base = stateField

                // pre-processing of color field name
                if (stateField.startsWith("bg:")) {
                  hasBG = true
                  base = stateField.slice(3)
                }

                // actual setting of color
                if (base.startsWith("#"))
                  color = base
                else if (esInstance[base])
                  color = this.textToRGB(esInstance[base][0])
                else
                  color = DEFAULT_EVENT_COLOR
              } else {
                color = DEFAULT_EVENT_COLOR
              }

            let actualtitle  
            const isHandles = esInstance["DESC IS HANDLEBARS"]
            if(isHandles ) {
              const convertedToHandlebars = descriptionEventField.replaceAll("{|{","{{").replaceAll("}|}","}}")
              const template = Handlebars.compile(convertedToHandlebars)
              actualtitle = template(esInstance)
            } else {
              const title = esInstance[descriptionEventField] || [esInstance.id]
              actualtitle = title[0] + (title.length > 1 ? `(${title.length})` : '')
            }

            let fc_start_date, fc_end_date
            fc_start_date = startDate
            fc_end_date = endDate

            // Get the start and end date, convert them to UTC and use the UTC dates
            // to render the events in the calendar. 
            if (instance_all_day) {
              let start_date = new Date(startDate);
              let end_date = new Date(endDate);
              fc_start_date = new Date(Date.UTC(start_date.getFullYear(), start_date.getMonth(), start_date.getDate())) 
              fc_end_date = new Date(Date.UTC(end_date.getFullYear(), end_date.getMonth(), end_date.getDate()+1) )
            }

              return {
                id: `calendar-event-${esInstance.id}`,
                title: actualtitle,
                start: fc_start_date,
                end: fc_end_date,
                allDay: instance_all_day, 
                backgroundColor: isHandles  ? "transparent" : color,
                borderColor: isHandles ? "transparent" : color, 
                // from: https://fullcalendar.io/docs/event-object
                // In addition to the fields above, you may also include your own non-standard fields in each Event object.
                // FullCalendar will not modify or delete these fields. For example, developers often include a description
                // field for use in callbacks like event render hooks. Any non-standard properites are moved into the
                // extendedProps hash during event parsing.
                useCustom: isHandles,
                esInstance,
                hasBG
              }
            })
      },

      buildTooltipInstance(el, esInstance, listViewActive) {
        const calendarApi = this.$refs.fullCalendar.getApi()


        let tooltipComponent 
        const tooltipTemplate = esInstance["TOOLTIP TEMPLATE"]
        if(tooltipTemplate && tooltipTemplate != "") {
            const convertedToHandlebars = tooltipTemplate.replaceAll("{|{","{{").replaceAll("}|}","}}")
            const template = Handlebars.compile(convertedToHandlebars)
            tooltipComponent = template(esInstance)
        } else {
          tooltipComponent = new Vue(Object.assign({propsData: {esInstance}}, Instance)).$mount().$el
        }

        return tippy(el, {
          content: tooltipComponent,
          allowHTML: true,
          delay: 100,
          duration: 0,
          placement: listViewActive ? 'right' : 'top',
          interactive: true,
          trigger: 'click',
          maxWidth: '700px',
          offset: [0, 10],
          appendTo: document.getElementsByClassName("fc-view")[0],
          zIndex: 10000, // +1 unit higher than the " .fc .fc-popover"
          onShown: () => {
            this.lazyCalendarConfigurer(calendarApi, false)
          },
          onHidden: () => {
            this.lazyCalendarConfigurer(calendarApi, this.allowCreateInstances)
          },
          onDestroy: () => {
            this.lazyCalendarConfigurer(calendarApi, this.allowCreateInstances)
          },
        })
      },

      redirectToNewInstance(dateInfo) {
        if (dateInfo.jsEvent.target.classList.contains("js-instance-label")) {
          // It's not a create operation, the user clicked in the instance label in the tooltip
          return
        }

        const fields = []
        // Since we need to choose only 1 set of fields use the first source spec (eventSources[0])
        fields.push({fieldDefinition: {name: this.eventSources[0]['DateStartEventField']}, value: dateInfo.start.getTime()})

        if (this.eventSources[0]['DateEndEventField']) {
          fields.push({fieldDefinition: {name: this.eventSources[0]['DateEndEventField']}, value: dateInfo.end.getTime()})
        }

        cob.app.navigateTo('#/instance/create/' + this.createDefinitionId + '/data=' + JSON.stringify({
          opts: {'auto-paste-if-empty': true},
          fields,
        }));
      },

      textToRGB: function(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = text.charCodeAt(i) + ((hash << 2) - hash)
        }
        hash = hash & 0x00FFFFFF

        // Escurece em caso de côr demasiado clara
        let red = (hash & 0x00FF0000) >> 16
        let green = (hash & 0x0000FF00) >> 8
        let blue = (hash & 0x000000FF)

        while (red + green + blue > 382) {
          red = red >= 10 ? red - 10 : red
          green = green >= 10 ? green - 10 : green
          blue = blue >= 10 ? blue - 10 : blue
        }

        let color = ((red << 16) + (green << 8) + blue).toString(16).toUpperCase();
        return `#${'00000'.substring(0, 6 - color.length) + color}`
      },
    }
  }
</script>

<style lang='css'>
  .fc .fc-toolbar.fc-header-toolbar {
    align-items: flex-end;
    font-size: 0.8rem;
  }

  .fc .fc-toolbar.fc-header-toolbar .fc-toolbar-chunk:first-child button:not(:first-child) {
    background-color: #fff;
    border-color: #fff;
    border-radius: 50%;
    color: #000;
    font-weight: 700;
  }

  .fc .fc-daygrid .fc-event,
  .fc .fc-list-table a,
  .fc .fc-popover .fc-event-title {
    cursor: pointer;
  }

  .fc .fc-daygrid-day-top {
    margin-bottom: 5px;
    justify-content: center;
    font-size: 0.8rem;
  }

  .fc .fc-daygrid-more-link {
    top: 10px;
    font-weight: 600;
  }

  .calendar-tooltip a {
    /* calendar component when in list mode is overriding the color */
    color: #3399CC !important;
  }

  .calendar-tooltip .main-info:hover {
    text-decoration: underline;
  }

  /* FIX para quando fazemos back de uma instância e temos o width errado */
  .fc-col-header, .fc-scrollgrid-sync-table, .fc-daygrid-body {
      width: 100% !important
  }

  .fc-day-sat .fc-daygrid-day-frame,
  .fc-day-sun .fc-daygrid-day-frame {
    background-color: #d0cfcf;
  }
</style>