import traverse from "traverse";

// Turns the parsed dashboard (output of parseDashboard in collector.js) into a Handlebars
// template string. Extracted from App.vue so that tooling (tests, repo sync CLI) can compile
// dashboards outside the browser with the exact same logic used at runtime.
function generateDashboardTemplate(dashboardParsed) {

    const JsonStringifyWithBlockHelpers = (json, replaceList) => {
        // Replacements will occur on every duplicate field of the dashboard instance that has a value starting with "{{#each something}} ..." or other block helper
        // replaceList will recursively be set with
        const newJson = traverse(json).map(function (node) {
            // If the node has a property with the same name as the name of the enclosing property (ie, something like 'Board' in '{ Board: [ { ..., Board:"string value",...}, ...]}' ) test for the block pattern
            // (this will be the situation for all duplicate fields, as set by the collector)
            const epn = this.parent && this.parent.key; //EPN = Enclosing Property Name
            const propertyValueForEPN = node && epn && typeof (node[epn]) === "string" && node[epn];
            const blockExpression = propertyValueForEPN && propertyValueForEPN.replaceAll("\n", " ").match(/^\s*{{#(\w+)\s+([^}]*)}}(.*)/);

            if (blockExpression) {
                node[epn] = blockExpression[3]; // Remove the block expression from the dashboard object and leave the remaining content
                const textToReplaceNode = "{{#" + blockExpression[1] + " " + blockExpression[2] + "}} " + JsonStringifyWithBlockHelpers(node, replaceList) + ", {{/" + blockExpression[1] + "}}"
                this.update("#REPLACE" + replaceList.length, true)
                replaceList.push(textToReplaceNode)
            }
        })
        return JSON.stringify(newJson)
    }

    let replaceList = []
    let template = JsonStringifyWithBlockHelpers(dashboardParsed, replaceList)
    for (let i = replaceList.length - 1; i > -1; i--) {
        template = template.replace('"#REPLACE' + i + '"', replaceList[i]) // The replacement of blocks must include de " " that were put around the block
    }
    return template
}

export { generateDashboardTemplate }
