const customizations = {}

function registerDashCustomization(dashName, boardName, customization){
    const key = `${dashName}-${boardName}`
    if(!customizations[key]) {
        customizations[key] = []
    }

    customizations[key].push(customization)
}

function getDashCustomization(dashName, boardName) {
    const key = `${dashName}-${boardName}`
    return customizations[key] || [] 
}

window.CoBDashCustomizations = window.CoBDashCustomizations || { registerDashCustomization, getDashCustomization ,customizations }