import Handlebars from "handlebars";

Handlebars.registerHelper("pasteInRm", function (...strings) {
    strings.pop() //for some reason the last item is of type Obj, and not an actual param
    if (strings.length > 0) {
        const result = {};
        for (let i = 0; i < strings.length; i += 2) {
            const key = strings[i];
            const value = strings[i + 1];
            result[key] = value;
        }
        const fields = Object.entries(result).map(([key, value]) => {
            return {
                "value": value,
                "fieldDefinition": {
                    "name": key
                }
            }
        })
        const data = {
            "opts": {
                "auto-paste-if-empty": true
            },
            "fields": fields
        }
        let stringifiedString = JSON.stringify(data)
        return stringifiedString
    }
    return ""
})

Handlebars.registerHelper("listSort", function (list, field, dir) {
    const isAscending = dir.toLowerCase() === 'asc';
    if (list) {
        return list.sort((a, b) => {
            if (a[field] < b[field]) {
                return isAscending ? -1 : 1;
            } else if (a[field] > b[field]) {
                return isAscending ? 1 : -1;
            } else {
                return 0;
            }
        });
    }
})

Handlebars.registerHelper("listFilter", function (list, field, value, first) {
    const filteredList = []
    if (list) {
        for (const obj of list) {
            if (obj[field] && obj[field][0] == value) {
                if (first === 'true') { //returns only the first match
                    return [obj]
                }
                filteredList.push(obj)
            }
        }
    }
    return filteredList.length > 0 ? filteredList : null;
})

Handlebars.registerHelper("screenSm", function () { return window.matchMedia("(max-width: 640px)").matches; })

Handlebars.registerHelper("screenMd", function () { return window.matchMedia("(max-width: 768px)").matches; })

Handlebars.registerHelper('isNaked', function () { return cob.app.getSettings().mode() === "naked" });

Handlebars.registerHelper('includes', function (arg1, arg2, caseInsensitive) {
    if (arg1.length > 0) { arg1 = arg1[0] } //hack for when handlerbars passes a list with a single value
    if (arg2.length > 0) { arg2 = arg2[0] } // of the string we want in it 
    if (caseInsensitive == true) {
        return arg1.toLowerCase().includes(arg2.toLowerCase())
    }
    return (arg1.includes(arg2))
});

Handlebars.registerHelper('concat', function (...args) {
    let result = ""
    for (let index = 0; index < args.length - 1; index++) {
        result = result.concat(args[index])
    }
    return result
});

Handlebars.registerHelper("format", function (type, val, options = {}) {
    let opts = options
    if (typeof (options) === 'string') {
        opts = JSON.parse(options.replaceAll('\\', ''))
    }

    if (type == "number") {
        return Intl.NumberFormat(opts.locale ? opts.locale : 'pt-PT', { style: "decimal", useGrouping: true }).format(val)
    }
})

Handlebars.registerHelper('eq', function (arg1, arg2) { return (arg1 == arg2); });

Handlebars.registerHelper('startsWith', function (arg1, arg2) { return (arg1.startsWith(arg2)); });

Handlebars.registerHelper('and', function (arg1, arg2) { return (arg1 && arg2); });

Handlebars.registerHelper('or', function (arg1, arg2) { return (arg1 || arg2); });

Handlebars.registerHelper('not', function (arg) { return (!arg); })

Handlebars.registerHelper('add', function (arg1, arg2) { return ((arg1 ? arg1 * 1 : 0) + arg2 * 1); });

Handlebars.registerHelper('greaterOrEq', function (arg1, arg2, options) {
    if (arg1 * 1 >= arg2 * 1) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

Handlebars.registerHelper('lesserOrEq', function (arg1, arg2, options) {
    if (arg1 * 1 <= arg2 * 1) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

Handlebars.registerHelper('greaterThan', function (arg1, arg2) {
    return ((arg1 ? arg1 * 1 : 0) > arg2 * 1);
});

Handlebars.registerHelper('lessThan', function (arg1, arg2) {
    return ((arg1 ? arg1 * 1 : 0) < arg2 * 1);
});

Handlebars.registerHelper('dateInfoTimestamp', function (timestamp, keyword) {
    if (!timestamp)
        return "No date."

    const date = new Date(timestamp * 1)

    if (keyword == "FullDateTime") {
        let options = {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "numeric",
            minute: "numeric",
            hour12: false,
        };
        return new Intl.DateTimeFormat(undefined, options).format(date)
    } if (keyword == "FullDate") {
        let options = {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour12: false,
        };
        return new Intl.DateTimeFormat(undefined, options).format(date)
    } if (keyword == "FullTime") {
        let options = {
            hour: "numeric",
            minute: "numeric",
            hour12: false,
        };
        return new Intl.DateTimeFormat(undefined, options).format(date)
    } else if (keyword == "FullWithWeekDay") {
        return new Intl.DateTimeFormat("pt", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(date)
    } else if (keyword == "WeekDay") {
        return new Intl.DateTimeFormat("pt", { weekday: "long" }).format(date)
    } else {
        return "No date."
    }
})

const formatDate = (date) => date.toISOString()

Handlebars.registerHelper('dateInfo', function (datestring, keyword) {
    const date = new Date(datestring)

    if (!datestring)
        return ""

    switch (keyword) {
        case "LastDateOfYear":
            return formatDate(new Date(date.getFullYear(), 11, 31, 23, 59))

        case "FirstDateOfYear":
            return formatDate(new Date(date.getFullYear(), 0, 1))

        case "LastDateOfMonth":
            const nextMonthFirstDay = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            const lastDayOfMonth = new Date(nextMonthFirstDay - 1);
            return formatDate(lastDayOfMonth)

        case "FirstDateOfMonth":
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
            return formatDate(firstDay)

        case "MonthText":
            const month = date.toLocaleString("pt", { month: 'short' })
            return month.charAt(0).toUpperCase() + month.slice(1, -1)

        case "FullDateText":
            return date.toLocaleString("pt", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

        case "WeekDayText":
            return date.toLocaleString("pt", { weekday: "long", day: "numeric" })

        case "FullYear":
            return date.getFullYear()

        case "MonthIndexAt1":
            return date.getMonth() + 1

        case "FirstEpochOfYear":
            const firstOfYear = new Date(date.getFullYear(), 0, 1);
            return firstOfYear.getTime()

        case "LastEpochOfYear":
            const lastOfYear = new Date(date.getFullYear(), 11, 31, 23, 59);
            return lastOfYear.getTime()

        case "FirstEpochOfMonth":
            const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
            return firstDayOfMonth.getTime()

        case "LastEpochOfMonth":
            const nextMonthFirstDayEpoch = new Date(date.getFullYear(), date.getMonth() + 1, 1, 23, 59);
            const lastDayOfMonthEpoch = new Date(nextMonthFirstDayEpoch - 1);
            return lastDayOfMonthEpoch.getTime()

        case "FirstEpochOfDay":
            const atMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0);
            return atMidnight.getTime()

        case "LastEpochOfDay":
            const atEleven = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59);
            return atEleven.getTime()

        default:
            return undefined
    }
})

Handlebars.registerHelper('today', function () {
    const today = new Date()
    return formatDate(today)
})

Handlebars.registerHelper('todayTimestamp', function () {
    return (new Date()).getTime()
})

function compareDatesAux(dateStrOrStamp1, dateStrOrStamp2, withTime) {
    let stamp1 = dateStrOrStamp1 * 1
    dateStrOrStamp1 = isNaN(stamp1) ? dateStrOrStamp1 : stamp1

    let stamp2 = dateStrOrStamp2 * 1
    dateStrOrStamp2 = isNaN(stamp2) ? dateStrOrStamp2 : stamp2

    const date1 = new Date(dateStrOrStamp1)
    const date2 = new Date(dateStrOrStamp2)

    let result = undefined
    if (date1.getDate() == date2.getDate() && date1.getMonth() == date2.getMonth() && date1.getFullYear() == date2.getFullYear()) {
        if (withTime) {
            if (date1.getHours() == date2.getHours() && date1.getMinutes() == date2.getMinutes()) {
                result = 0
            }
        } else {
            result = 0
        }
    }

    if (result == undefined) {
        if (date1.getTime() > date2.getTime()) {
            result = 1
        } else if (date1.getTime() < date2.getTime()) {
            result = -1
        } else {
            result = 0
        }
    }

    return result
}
Handlebars.registerHelper('compareDates', function (dateStrOrStamp1, dateStrOrStamp2) {
    return compareDatesAux(dateStrOrStamp1, dateStrOrStamp2, false)
})
Handlebars.registerHelper('compareDateTimes', function (dateStrOrStamp1, dateStrOrStamp2) {
    return compareDatesAux(dateStrOrStamp1, dateStrOrStamp2, true)
})


function paging(direction, current, size, limit) {

    const isNumeric = function (str) {
        if (typeof str != "string") return false
        return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)
            !isNaN(parseFloat(str)) // and ensure strings of whitespace fail
    }

    if (current) { // var may not be initialized when dash is mounted/rendered...
        if (!isNumeric(current)) {
            // handle date 
            const n = parseInt(size.slice(0, -1)) * direction
            const order = size.slice(-1).toLowerCase()
            const date = new Date(current)
            date.setHours(15) //timezone things, quickfix for now

            if (order === 'd') { // days 
                date.setDate(date.getDate() + n)
            } if (order === 'w') { // weeks  
                date.setDate(date.getDate() + n * 7)
            } if (order === 'm') { // months 
                date.setMonth(date.getMonth() + n)
            } if (order === 'y') { // years  
                date.setFullYear(date.getFullYear() + n)
            }

            if (limit) {
                const limitDate = new Date(limit)
                limitDate.setHours(15)
                if (direction < 0 && limitDate > date)
                    return formatDate(limitDate)
                if (direction > 0 && limitDate < date)
                    return formatDate(limitDate)
            }

            return formatDate(date)
        } else {
            // handle number 
            let aux_current = parseInt(current)
            const shifted = aux_current + size * direction
            if ((direction > 0 && limit && shifted > limit) ||
                (direction < 0 && limit && shifted < limit))
                return limit
            return shifted
        }
    }
}

Handlebars.registerHelper('nextPage', function (current, size, limit = undefined) {
    return paging(1, current, size, limit)
})
Handlebars.registerHelper('prevPage', function (current, size, limit = undefined) {
    return paging(-1, current, size, limit)
})

Handlebars.registerHelper('lookupWithDefault', function (obj, key, defaultValue) {
    return obj[key] ? obj[key] : defaultValue
})

Handlebars.registerHelper('createVar', function (varsObject, varName, value) {
    varsObject[varName] = value
})

function localIterableEval(obj, evalCode, someOrEveryOrFilter, options = { defaultValue: false }) {
    let filter = []
    for (const key in obj) {
        const val = typeof obj[key] == 'object' ? JSON.stringify(obj[key]) : `'${obj[key]}'`
        evalCode = evalCode.replaceAll(/\\"/g, "\"").replaceAll(/\\'/g, "\'")
        const code = `((key,val) =>  ${evalCode}) ('${key}', ${val})`
        let evalResult

        try {
            evalResult = eval(code)
        } catch (e) {
            console.error("eval error of key:" + key + " and value:" + JSON.stringify(obj[key]) + " --> ", e)
        }
        if (someOrEveryOrFilter == "some") {
            if (evalResult) return true
        } else if (someOrEveryOrFilter == "filter") {
            if (evalResult) {
                filter.push(evalResult)
                if (options.firstOnly == "first") {
                    return filter
                }
            }
        } else if (!evalResult) { //for every
            return false
        }
    }
    return options.defaultValue
}

Handlebars.registerHelper("filter", function (obj, evalCode, allOrFirst) {
    return localIterableEval(obj, evalCode, "filter", { defaultValue: [], firstOnly: allOrFirst })
})

Handlebars.registerHelper('some', function (obj, evalCode) {
    return localIterableEval(obj, evalCode, "some", { defaultValue: false })
})

Handlebars.registerHelper('every', function (obj, evalCode) {
    return localIterableEval(obj, evalCode, "every", { defaultValue: false })
})


export { Handlebars }