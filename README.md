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

### Dashboards as code (groundwork)

The modules below allow processing dashboards outside the browser (tests, future repo sync tooling),
using the exact same logic the app uses at runtime:

* `src/collector.js` — `parseDashboard` (instance -> canonical representation) and the exported
  `DashTemplate`/`ComponentsTemplates` that define the canonical structure
* `src/template_generator.js` — `generateDashboardTemplate` (canonical -> Handlebars template),
  extracted from `App.vue`
* `src/serializer.js` — `serializeDashboard` (canonical -> instance, the inverse of `parseDashboard`)
  and `parseDashboardExtras` (captures Solution/Description/Order, used by the dashboard listing but
  not part of the rendered structure)

The guaranteed property (see `src/test_serializer.js`) is that serialization is a fixed point of the
parse/serialize cycle: `parseDashboard(serializeDashboard(parseDashboard(raw))) ≡ parseDashboard(raw)`

To check that property against a real dashboard of a server (saved with an authenticated browser
session: the instance from `/recordm/recordm/instances/<id>` and the definition from
`/recordm/recordm/definitions/name/Dashboard_v1`):

```
node src/check_roundtrip.js instance.json definition.json
```
