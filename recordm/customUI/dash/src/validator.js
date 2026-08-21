// Structural validation of the canonical dashboard representation, derived from the exact same
// templates the app uses at runtime (DashTemplate/ComponentsTemplates). Catches the manual-edit
// mistakes that would otherwise be silent: unknown keys (dropped by the serializer, i.e. the
// value would be LOST on push), wrong shapes, invalid component types and broken handlebars.
//
// validateDashboard(canonical, { hbsFiles? }) -> { errors: [...], warnings: [...] }
// each finding: { path, message, file? } — paths are 1-based (the first Board is Board[1]),
// matching the .hbs file names; `file` is set when the value lives in an exploded .hbs file.
import Handlebars from 'handlebars'
import { DashTemplate, ComponentsTemplates } from './collector.js'
import { DashExtrasTemplate } from './serializer.js'
import { elementSegment, fieldFileName, isSingletonGroup, FILE_REF_PREFIX } from './repo_format.js'

// keys produced by the tooling itself, valid anywhere they appear. Note: the components' type
// key ("Component") is NOT here — inside a component element it is its ownKey, and at board
// level "Component" is the components array, which must be descended into
const META_KEYS = new Set(["id", "instanceId", "version", "Dash"])

function levenshtein(a, b) {
    const rows = Array.from({ length: a.length + 1 }, (unused, i) => [i])
    for (let j = 1; j <= b.length; j++) rows[0][j] = j
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            rows[i][j] = Math.min(
                rows[i - 1][j] + 1,
                rows[i][j - 1] + 1,
                rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
            )
        }
    }
    return rows[a.length][b.length]
}

function suggestion(wrong, candidates) {
    let best = null
    let bestDistance = 3 // suggest only close matches (edit distance <= 2)
    for (const candidate of candidates) {
        const distance = levenshtein(wrong.toLowerCase(), candidate.toLowerCase())
        if (distance < bestDistance) {
            bestDistance = distance
            best = candidate
        }
    }
    return best ? " — querias '" + best + "'?" : ""
}

function validateDashboard(canonical, options = {}) {
    const errors = []
    const warnings = []
    const referencedFiles = new Set()

    const isExternalized = (value) => value.includes("\n") || value.startsWith(FILE_REF_PREFIX)

    const checkScalar = (value, displayPath, fileSegments) => {
        if (value === null || typeof value === 'object') {
            errors.push({ path: displayPath, message: "esperava um valor simples (texto)" })
            return
        }
        if (typeof value !== 'string') return // numbers/booleans are coerced by implode
        const file = isExternalized(value) ? fieldFileName(fileSegments) : null
        if (file) referencedFiles.add(file)
        if (!value.includes("{{")) return
        try {
            Handlebars.precompile(value)
        } catch (e) {
            // own values of duplicables may START with a block helper that is closed by the
            // template generator, not by the value itself — retry with an artificial close
            const block = value.replaceAll("\n", " ").match(/^\s*{{#(\w+)[\s(}]/)
            if (block) {
                try {
                    Handlebars.precompile(value + "{{/" + block[1] + "}}")
                    return
                } catch (retryError) { /* report the original error below */ }
            }
            errors.push({ path: displayPath, file, message: "handlebars inválido: " + ("" + e.message).split("\n")[0] })
        }
    }

    // valid names at a level, for "did you mean" suggestions: the level's own keys plus the
    // sub-fields of its singleton groups, which sit at this level in the flattened YAML
    const levelKeys = (template) => Object.keys(template).flatMap(key =>
        (Array.isArray(template[key]) && isSingletonGroup(key)) ? [key, ...Object.keys(template[key][0] || {})] : [key])

    const validateElement = (element, template, ownKey, displayPath, fileSegments) => {
        if (element === null || typeof element !== 'object' || Array.isArray(element)) {
            errors.push({ path: displayPath, message: "esperava um objecto (ocorrência de '" + ownKey + "')" })
            return
        }
        for (const key of Object.keys(element)) {
            const value = element[key]
            const keyPath = (displayPath ? displayPath + "." : "") + key
            if (key === ownKey || META_KEYS.has(key)) {
                if (typeof value === 'string') checkScalar(value, keyPath, fileSegments.concat(key))
                continue
            }
            if (!(key in template)) {
                const owner = Object.keys(template).find(t =>
                    Array.isArray(template[t]) && isSingletonGroup(t) && key in (template[t][0] || {}))
                if (owner) {
                    // an exact sub-field of a singleton group left at this level: only happens
                    // when the group is ALSO present in list form (otherwise implode nests it)
                    errors.push({ path: keyPath, message: "'" + key + "' pertence ao grupo '" + owner + "', que está em forma de lista — move o campo para dentro da lista ou achata o grupo todo" })
                } else {
                    errors.push({ path: keyPath, message: "chave desconhecida" + suggestion(key, levelKeys(template)) })
                }
                continue
            }
            validateEntry(value, template[key], key, displayPath, fileSegments)
        }
    }

    // dispatch for one key of an element: singleton groups are flattened in the YAML, so they
    // contribute NO path/file-name segment - their sub-fields report at the parent level
    const validateEntry = (value, templateValue, key, parentPath, parentSegments) => {
        const keyPath = (parentPath ? parentPath + "." : "") + key
        if (Array.isArray(templateValue) && isSingletonGroup(key)) {
            if (Array.isArray(value) && value.length === 1 && value[0] !== null && typeof value[0] === 'object' && !Array.isArray(value[0])) {
                validateElement(value[0], templateValue[0] || {}, key, parentPath, parentSegments)
            } else {
                errors.push({ path: keyPath, message: "esperava uma ocorrência única do grupo '" + key + "'" })
            }
            return
        }
        validateValue(value, templateValue, key, keyPath, parentSegments.concat(key))
    }

    const validateValue = (value, templateValue, key, displayPath, fileSegments) => {
        if (Array.isArray(templateValue)) {
            if (!Array.isArray(value)) {
                errors.push({ path: displayPath, message: "esperava uma lista de '" + key + "'" })
                return
            }
            value.forEach((element, i) => {
                const type = (element && typeof element === 'object' && typeof element.Component === 'string') ? element.Component : null
                const elementPath = displayPath + "[" + (i + 1) + (type && key === "Component" ? "(" + type + ")" : "") + "]"
                const elementSegments = fileSegments.concat(elementSegment(element, i))
                if (key === "Component") {
                    // boards hold typed components: the template is the component type's one
                    if (!type) {
                        errors.push({ path: elementPath, message: "componente sem tipo ('Component')" })
                        return
                    }
                    const componentTemplate = ComponentsTemplates[type]
                    if (!componentTemplate) {
                        errors.push({ path: elementPath, message: "tipo de componente desconhecido" + suggestion(type, Object.keys(ComponentsTemplates)) })
                        return
                    }
                    if (!("id" in element)) {
                        warnings.push({ path: elementPath, message: "componente sem 'id' — no push será criado como campo novo" })
                    }
                    validateElement(element, componentTemplate, "Component", elementPath, elementSegments)
                } else {
                    validateElement(element, templateValue[0] || {}, key, elementPath, elementSegments)
                }
            })
            return
        }
        checkScalar(value, displayPath, fileSegments)
    }

    // the root is validated like any element (with no own key): meta keys skipped, singleton
    // groups (DashboardCustomize) flattened, unknown keys suggested over the level's names
    const rootTemplate = { ...DashTemplate, ...DashExtrasTemplate }
    validateElement(canonical, rootTemplate, null, "", [])

    // .hbs files in the directory that nothing references (renamed/removed fields)
    for (const hbsFile of (options.hbsFiles || [])) {
        if (!referencedFiles.has(hbsFile)) {
            warnings.push({ path: hbsFile, message: "ficheiro órfão — nada o referencia no dashboard.yaml" })
        }
    }

    return { errors, warnings }
}

export { validateDashboard }
