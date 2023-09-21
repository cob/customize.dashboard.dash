cob.custom.customize.push(async function(core, utils, ui) {

  core.customizeSaveBehaviors("Dashboard_v1", [
    {
      name:"save",
      icon: "icon-ok"
    },
    {
      name: "save-edit",
      icon: "icon-ok"
    }
  ])

  core.customizeSaveBehaviors("Dashboard-Solutions", [
    {
      name:"save",
      icon: "icon-ok"
    },
    {
      name: "save-edit",
      icon: "icon-ok"
    }
  ])
})