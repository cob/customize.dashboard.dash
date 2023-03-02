cob.custom.customize.push(async function(core, utils, ui) {

  const DEFINITION = "Dashboard_v1";

  core.customizeSaveBehaviors(DEFINITION, [
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