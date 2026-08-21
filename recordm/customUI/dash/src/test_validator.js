// Tests for validator.js (structural validation of the canonical representation).
// Run with: node src/test_validator.js   (Node >= 22)
import assert from 'node:assert/strict'
import { serializeDashboard, parseDashboardFull } from './serializer.js'
import { explodeDashboard, stripDerived } from './repo_format.js'
import { validateDashboard } from './validator.js'
import { c0, loadNumberedDefinition } from './test_fixture.js'

const definition = loadNumberedDefinition()
const clean = () => stripDerived(parseDashboardFull(serializeDashboard(c0, definition)))

// ---------------------------------------------------------------------------------------------
// a clean pulled dashboard has zero findings (including its duplicable block-helpers, which are
// intentionally unclosed: "{{#each work_list}} ..." in a Board own value is NOT an error)
// ---------------------------------------------------------------------------------------------
const cleanFiles = Object.keys(explodeDashboard(clean())).filter(f => f.endsWith(".hbs"))
const ok = validateDashboard(clean(), { hbsFiles: cleanFiles })
assert.deepEqual(ok.errors, [])
assert.deepEqual(ok.warnings, [])

// ---------------------------------------------------------------------------------------------
// unknown keys (the serializer would silently DROP these values) are errors with a suggestion
// ---------------------------------------------------------------------------------------------
const typo = clean()
typo.Board[0].Component[0].LabelCustomize[0].LabelClases = typo.Board[0].Component[0].LabelCustomize[0].LabelClasses
delete typo.Board[0].Component[0].LabelCustomize[0].LabelClasses
const typoResult = validateDashboard(typo)
assert.equal(typoResult.errors.length, 1)
// singleton groups are flattened in the YAML, so paths skip them: the sub-field reports at the
// component level, matching what the user sees in dashboard.yaml
assert.equal(typoResult.errors[0].path, "Board[1].Component[1(Label)].LabelClases")
assert.ok(typoResult.errors[0].message.includes("querias 'LabelClasses'"), typoResult.errors[0].message)

// same typo written at the component level (where the flattened YAML puts the sub-fields):
// implode leaves the unknown key there, and the suggestion still finds the group's sub-field
const levelTypo = clean()
levelTypo.Board[0].Component[0].LabelClases = "x"
const levelTypoResult = validateDashboard(levelTypo)
assert.equal(levelTypoResult.errors.length, 1)
assert.equal(levelTypoResult.errors[0].path, "Board[1].Component[1(Label)].LabelClases")
assert.ok(levelTypoResult.errors[0].message.includes("querias 'LabelClasses'"), levelTypoResult.errors[0].message)

// an EXACT sub-field name at the level while the group is in list form: specific message (with
// the flat form implode would have nested it into the group)
const mixed = clean()
mixed.Board[0].Component[0].LabelClasses = "x"
const mixedResult = validateDashboard(mixed)
assert.equal(mixedResult.errors.length, 1)
assert.ok(mixedResult.errors[0].message.includes("pertence ao grupo 'LabelCustomize'"), mixedResult.errors[0].message)

// a singleton group must be a single occurrence (implode always rebuilds it that way)
const badGroup = clean()
badGroup.Board[0].Component[0].LabelCustomize = "Classes"
assert.ok(validateDashboard(badGroup).errors.some(e =>
    e.path === "Board[1].Component[1(Label)].LabelCustomize" && e.message.includes("ocorrência única")))

// unknown root key too
const rootTypo = clean()
rootTypo.Descriptio = "x"
assert.ok(validateDashboard(rootTypo).errors.some(e => e.path === "Descriptio" && e.message.includes("querias 'Description'")))

// ---------------------------------------------------------------------------------------------
// invalid component type, with suggestion
// ---------------------------------------------------------------------------------------------
const badType = clean()
badType.Board[0].Component[1].Component = "Filtro"
const badTypeResult = validateDashboard(badType)
assert.equal(badTypeResult.errors.length, 1)
assert.equal(badTypeResult.errors[0].path, "Board[1].Component[2(Filtro)]")
assert.ok(badTypeResult.errors[0].message.includes("querias 'Filter'"), badTypeResult.errors[0].message)

// ---------------------------------------------------------------------------------------------
// wrong shapes: a list where the template has one, an object where a scalar is expected
// ---------------------------------------------------------------------------------------------
const badShape = clean()
badShape.Board[1].Component[0].Text = "não devia ser texto"
assert.ok(validateDashboard(badShape).errors.some(e =>
    e.path === "Board[2].Component[1(Menu)].Text" && e.message.includes("esperava uma lista")))

// ---------------------------------------------------------------------------------------------
// handlebars per field: a broken block in the middle of a value is an error pointing at the
// field (and its .hbs file when externalized); values STARTING with a duplicable block are fine
// ---------------------------------------------------------------------------------------------
const badHbs = clean()
badHbs.Board[2].Component[0].MDContent = "texto\n{{#if aberto}} sem fecho"
const badHbsResult = validateDashboard(badHbs)
assert.equal(badHbsResult.errors.length, 1)
assert.equal(badHbsResult.errors[0].path, "Board[3].Component[1(Markdown)].MDContent")
assert.equal(badHbsResult.errors[0].file, "Board.3.Component.1-Markdown.MDContent.hbs")
assert.ok(badHbsResult.errors[0].message.includes("handlebars inválido"))

// ---------------------------------------------------------------------------------------------
// warnings: orphan .hbs files and components without id
// ---------------------------------------------------------------------------------------------
const noId = clean()
delete noId.Board[0].Component[0].id
const noIdResult = validateDashboard(noId, { hbsFiles: cleanFiles.concat("orfao.hbs") })
assert.equal(noIdResult.errors.length, 0)
assert.ok(noIdResult.warnings.some(w => w.path === "Board[1].Component[1(Label)]" && w.message.includes("sem 'id'")))
assert.ok(noIdResult.warnings.some(w => w.path === "orfao.hbs" && w.message.includes("órfão")))

console.log("test_validator: ALL TESTS PASSED")
