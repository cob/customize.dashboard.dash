// Tests for template_generator.js (extracted from App.vue).
// Run with: node src/test_template_generator.js   (Node >= 22)
import assert from 'node:assert/strict'
import Handlebars from 'handlebars'
import { generateDashboardTemplate } from './template_generator.js'

// A dashboard without block helpers stringifies as plain JSON
const plainDash = {
    Name: "Plain",
    DashboardCustomize: [{ DashboardCustomize: "Width", Width: "w-full" }],
    Board: [{ Board: "Title", Component: [{ Component: "Label", Label: "Olá {{user.username}}" }] }],
}
assert.equal(generateDashboardTemplate(plainDash), JSON.stringify(plainDash))

// A duplicated field whose own value starts with a block helper gets the whole element wrapped
// in that block (this is what allows '{{#each ...}}' in Board/Text/... values to repeat them)
const dash = {
    Name: "Blocks",
    Board: [
        { Board: "Fixed", X: "0" },
        { Board: "{{#each work_list}} {{this.name}}", X: "1" },
    ],
}
const template = generateDashboardTemplate(dash)
assert.ok(template.startsWith('{"Name":"Blocks"'))
assert.ok(template.includes('{{#each work_list}}'))
assert.ok(template.includes('{{/each}}'))
assert.ok(!template.includes('#REPLACE'))

// and processing it like App.vue's buildDashboard does produces one element per iteration
const processed = Handlebars.compile(template)({ work_list: [{ name: "A" }, { name: "B" }] })
let dashStr = processed
while (dashStr.match(/,\s*]/)) {
    dashStr = dashStr.replaceAll(/,\s*]/g, "]")
}
dashStr = dashStr.replaceAll(/(,(\s*))+/g, ",$2")
const result = JSON.parse(dashStr)
assert.equal(result.Board.length, 3)
assert.equal(result.Board[0].Board, "Fixed")
assert.equal(result.Board[1].Board.trim(), "A")
assert.equal(result.Board[1].X, "1")
assert.equal(result.Board[2].Board.trim(), "B")

console.log("test_template_generator: ALL TESTS PASSED")
