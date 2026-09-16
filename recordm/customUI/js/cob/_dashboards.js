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

  core.validateInstances("Dashboard_v1", function (instance, successCb, failCb) {

    function validateBoardFields(fields){
      const errors = []
      fields.forEach(f => {
        if(f.value) errors.push({ fieldId: f.id, localizedMessage: "Value not allowed when Link is defined"})
        if(f.fields && f.fields.length > 0) errors.push(...validateBoardFields(f.fields))
      })

      return errors
    }


    const errors = []

    const linkField = instance.findFields("Link")[0];
    if (linkField.value) {
      instance.findFields("Board").forEach(boardField => {
        if(boardField.value){
          errors.push({ fieldId: boardField.id, localizedMessage: "Value not allowed when Link is defined"})
        }

        errors.push(...validateBoardFields(boardField.fields))
      })
    }

    if (errors.length === 0) {
      successCb()

    } else {
      failCb(errors)
    }
  })

})