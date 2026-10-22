// Tests for handlebars_nesting.js
// Run with: node src/test_handlebars_nesting.js   (Node >= 22)
import assert from 'node:assert/strict'
import { blockDepths, decorateNesting } from './handlebars_nesting.js'

// Block tags sit at the level of their block. The content sits one level inside.
const nested = [
    "interface X",          // 0
    "{{#if a}}",            // 0
    " ip {{ip}}",           // 1
    "{{#each vlans}}",      // 1
    " vlan {{this}}",       // 2
    "{{/each}}",            // 1
    "{{else if b}}",        // 0
    " no ip",               // 1
    "{{~^~}}",              // 0
    " shutdown",            // 1
    "{{/if}}",              // 0
    "end",                  // 0
].join("\n")
assert.deepEqual(blockDepths(nested), { depths: [0, 0, 1, 1, 2, 1, 0, 1, 0, 1, 0, 0], errors: new Set() })

// A block that opens and closes on one line changes no level.
assert.deepEqual(blockDepths("a {{#if x}}b{{/if}}\nc").depths, [0, 0])

// Comments and variables do not count.
assert.deepEqual(blockDepths("{{! {{#if x}} }}\n{{!-- {{/if}}\n{{#each}} --}}\n{{elsewhere}} {{x}}").depths, [0, 0, 0, 0])

// A close without an open and an open without a close are errors.
assert.deepEqual(blockDepths("{{/if}}\n{{#if a}}\nx").errors, new Set([0, 1]))
assert.deepEqual(blockDepths("{{else}}").errors, new Set([0]))

// Each html line gets its level. A span that crosses lines opens again on the next one.
const html = decorateNesting(
    "{{#if a}}\n{{!-- x\ny --}}\n{{/if}}",
    '<span class="t">{{#if a}}</span>\n<span class="c">{{!-- x\ny --}}</span>\n<span class="t">{{/if}}</span>')
assert.deepEqual(html.split("\n"), [
    '<span class="hb-level-0"><span class="t">{{#if a}}</span></span>',
    '<span class="hb-level-1"><span class="c">{{!-- x</span></span>',
    '<span class="hb-level-1"><span class="c">y --}}</span></span>',
    '<span class="hb-level-0"><span class="t">{{/if}}</span></span>',
])

// The colors repeat after 5 levels.
assert.ok(decorateNesting("{{#a}}{{#b}}{{#c}}{{#d}}{{#e}}\nx", "l1\nl2").endsWith('<span class="hb-level-0">l2</span>'))

console.log("test_handlebars_nesting: ok")
