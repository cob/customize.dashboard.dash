# COB Dashboard

## Install

`cob-cli customize dash`

Configurar no web.properties:
```
custom-ui.items=home
custom-ui.items.home.label=Home
custom-ui.items.home.url=dash
```

After creating the definitions, import the following xls       
```
1.dashboard-solutions.xlsx
2.dashboard_v1.xlsx
dashboard_chooser_0.28.0.xlsx (this one substitutes the chooser dashboard; delete manually the one created by the 1st sheet) 
```


### Definition Upgrades:

See [readme](./others/customize.dashboard.dash/README.MD)

## Development

### Tests

```
cd recordm/customUI/dash
npm test        # requires Node >= 22
```

## Dashboards as code

Complex dashboards can be represented in the client repo (git: IDE editing, versioning, diffs)
while simple ones keep being edited directly in the application. Dashboards are always CREATED in
the application; `pull` is the only way into the repo.

### Layout (in the client repo)

```
recordm/customUI/dashs/<Name>/dashboard.yaml   canonical representation (carries instanceId + version)
recordm/customUI/dashs/<Name>/*.hbs            multiline fields (templates/HTML/Context), one file
                                               each, referenced as "@file:<name>.hbs"
```

Editing notes for `dashboard.yaml`: every value is a string — quote anything YAML would mistype
(values starting with `#`, `{{`, `*` or `&`; unquoted numbers/booleans are coerced back to strings
on read, but a value starting with an unquoted `#` becomes null and fails loudly). YAML comments do
NOT survive a pull (the file is regenerated from the server) — annotate inside the `.hbs` files
with handlebars comments (`{{!-- --}}`) instead, those are part of the field value.

### Workflow

1. Create (or duplicate) the dashboard in the application, once
2. `npm run dash-sync pull <instanceId>` — brings it into `recordm/customUI/dashs/`
3. `cob-cli test -d dash` and browse the DASH dev server (port 8041, NOT the 8040 one the cli
   opens): `http://localhost:8041/recordm/index.html#/cob.custom-resource/<id>/dash`. Dashboards
   present in `recordm/customUI/dashs/` are served from the local files and any edit reloads the
   browser (see `tools/dev_middleware.js`) — the 8040 customUI server proxies instance requests
   straight to the real server, so the interception and the reload only work on 8041. Iterating
   writes NOTHING to RecordM, so the instance version history keeps its meaning
4. `npm run dash-sync push <Name>` — deliberate save: one meaningful version on the instance.
   Refuses if the server version moved (someone edited in the app): use `diff`/`pull` first
5. `npm run dash-sync status` / `diff <Name>` — detect and inspect changes made in the application
6. `npm run dash-sync validate [Name]` — offline structural validation (unknown keys with
   suggestions, component types, per-field handlebars, orphan .hbs files; paths are 1-based:
   the first Board is Board[1]). Runs automatically on `push` (errors abort — an unknown key
   would silently lose its value) and its findings show up as `[CoB] ⚠` lines on each serve
   during `cob-cli test`. Exit code 1 on errors, so it is CI friendly

CLI auth: env `COB_TOKEN` or `COB_USERNAME`/`COB_PASSWORD` (prompted otherwise). The server is
resolved like cob-cli does: `environments/<env>/server` (env defaults to `prod`, override with
`--env <name>`), or explicitly via `COB_SERVER` / `--server <url>`.

Sync model: the canonical `version` field means "this representation corresponds to version N of
the instance"; `push` requires the server to still be at N (optimistic locking) and ends with an
implicit pull recording N+1. Local uncommitted edits are git's responsibility: `pull` refuses to
overwrite them (`--force` to override).

### Modules (all reusable outside the browser)

* `src/collector.js` — `parseDashboard` (instance -> canonical representation) and the exported
  `DashTemplate`/`ComponentsTemplates` that define the canonical structure
* `src/template_generator.js` — `generateDashboardTemplate` (canonical -> Handlebars template),
  extracted from `App.vue`
* `src/serializer.js` — `serializeDashboard` (canonical -> instance, the inverse of
  `parseDashboard`), `parseDashboardFull` (canonical + Solution/Description/Order root fields)
  and `adoptFieldIds` (grafts server field ids for editor-like saves)
* `src/repo_format.js` — the `dashboards/<Name>/` directory format (explode/implode of
  multiline fields into `.hbs` files)
* `src/validator.js` — structural validation derived from the same templates the app uses
* `tools/dash-sync.js` — pull/push/diff/status/validate CLI
* `tools/dev_middleware.js` — dev-server interception + browser reload (wired in `vue.config.js`)

The guaranteed property (see `src/test_serializer.js`) is that serialization is a fixed point of the
parse/serialize cycle: `parseDashboard(serializeDashboard(parseDashboard(raw))) ≡ parseDashboard(raw)`

To check that property against a real dashboard of a server (saved with an authenticated browser
session: the instance from `/recordm/recordm/instances/<id>` and the definition from
`/recordm/recordm/definitions/name/Dashboard_v1`):

```
node src/check_roundtrip.js instance.json definition.json
```
