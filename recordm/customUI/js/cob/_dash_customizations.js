const customizations = {}

function registerDashCustomization(dashName, customization){
    const key = `${dashName}`
    if(!customizations[key]) {
        customizations[key] = []
    }

    customizations[key].push(customization)
}

function getDashCustomization(dashName) {
    const key = `${dashName}`
    return customizations[key] || [] 
}

window.CoBDashCustomizations = window.CoBDashCustomizations || { registerDashCustomization, getDashCustomization ,customizations }
