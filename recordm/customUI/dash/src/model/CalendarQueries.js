import { toEsFieldName } from '@cob/rest-api-wrapper/src/utils/ESHelper';

// The Calendar publishes the date range it is showing ([start, end] in ms) in this var, so that App.vue
// can build the event queries together with the other board queries (and stop/reuse/refresh them).
// When there's nothing to show (ex: HeaderOnly with the calendar hidden) the var is left undefined.
export function calendarRangeVar(component) {
    return "__calendarRange_" + component.id
}

// Range actually queried: [startDate, endDate[ in ms, cropped to a single month if 'CropMonth' is set
export function calendarQueryBounds(component, range) {
    let startDate = range[0]
    let endDate = range[1]

    const options = component['CalendarCustomize'][0]
    const cropMonth = options['CalendarCustomize'] != null && options['CalendarCustomize'].split("\u0000").indexOf("CropMonth") !== -1
    if (cropMonth) {
        let start = new Date(range[0])
        if (start.getDate() > 1) {
            start.setDate(1)
            start.setMonth(start.getMonth() + 1)
            start.setHours(0)
            start.setMinutes(0)
            start.setSeconds(0)
        }
        // last day of the month
        let end = new Date(start)
        end.setMonth(start.getMonth() + 1)
        end.setDate(0)
        end.setHours(23)
        end.setMinutes(59)
        end.setSeconds(59)

        startDate = start.getTime()
        endDate = end.getTime()
    }
    return { startDate, endDate }
}

export function calendarDateRangeQuery(eventSource, startDate, endDate) {
    const startField = toEsFieldName(eventSource['DateStartEventField'])
    const endField = toEsFieldName(eventSource['DateEndEventField'])
    let dateRangeQuery = `${startField}:[${startDate} TO ${endDate - 1}]`
    if (endField) {
        dateRangeQuery += ` OR ${endField}:[${startDate + 1} TO ${endDate - 1}]`
        dateRangeQuery += ` OR (${startField}:<${startDate} AND ${endField}:>=${endDate - 1})`
    }
    return `(${dateRangeQuery})`
}

// One query per event source ('Events') of the Calendar component
export function calendarQueries(component, range) {
    const { startDate, endDate } = calendarQueryBounds(component, range)
    const inputVarCalendar = component['CalendarCustomize'][0]['InputVarCalendar'] || []
    const inputVars = new Set(inputVarCalendar.map(inputVar => inputVar['InputVarCalendar']))
    const inputQuery = [...inputVars].map(inputVar => component.vars[inputVar]).join(' ')

    return component['Events'].map(eventSource => {
        const eventQuery = eventSource['EventsQuery'] || '*'
        const dateRangeQuery = calendarDateRangeQuery(eventSource, startDate, endDate)
        return `${eventQuery} AND (${dateRangeQuery}) ${inputQuery}`.trim()
    })
}
