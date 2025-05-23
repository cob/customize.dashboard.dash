const clone = (obj) => JSON.parse(JSON.stringify(obj))

function collect(bucket, source) {
    const sourceName = source.fieldDefinition.name
    const children = source.fields
    const bucketKeys = Object.keys(bucket);
    if (bucketKeys.indexOf(sourceName) >= 0) {
        //Means that found one key in current source
        if (Array.isArray(bucket[sourceName])) {
            // Means type of value to collect is array
            if (bucket[sourceName].length === 0 || bucket[sourceName][0]["Mark"] === "JUST COPY") {
                //Means the bucket template only specify to get the raw elements that match (empty array in bucket template or having first element signaled that it was originally an empty array)
                source["Mark"] = "JUST COPY"       // Signal it was an empty array
                source[sourceName] = source.value  // Add extra field with original name of the source
                bucket[sourceName].push(source)    // Add to bucket collector
            } else {
                //Means the bucket specifies a template for the array elements
                let initialBucketCopy
                if (typeof bucket[sourceName][0].Initial_Template == "undefined") {
                    //Means it's the initial bucket (because it doesn't have the Initial_Template field copy)
                    initialBucketCopy = clone(bucket[sourceName][0])                  // Clone the bucket template
                    initialBucketCopy.Initial_Template = clone(initialBucketCopy)     // Save a copy of the bucket template as template for additional items
                    bucket[sourceName].shift()                                        // remove original empty bucket template from collection
                } else {
                    // Means it's additional source matches
                    initialBucketCopy = clone(bucket[sourceName][0].Initial_Template) // we use a copy of the previously copied template
                }
                initialBucketCopy.instanceId = bucket.instanceId  //needed to build $file url
                children.reduce(collect, initialBucketCopy)    // collect values from the children
                initialBucketCopy[sourceName] = source.value  // Add extra field with original name of the source
                bucket[sourceName].push(initialBucketCopy)    // Add to bucket collector
            }
        } else {
            // Means it's not an array and we can collect the final value
            if (source.value && source.fieldDefinition.description && source.fieldDefinition.description.indexOf("$file") >= 0) {
                bucket[sourceName] = "/recordm/recordm/instances/" + bucket.instanceId + "/files/" + source.fieldDefinition.id + "/" + source.value
            } else {
                bucket[sourceName] = source.value;
            }
        }
    } else if (children.length > 0) {
        // Means it didn't find a match. Continue looking in the children
        for (source of children) {
            source.fields.reduce(collect, bucket);
        }
    }
    return bucket;
}

function parseDashboard(raw_dashboard) {
    let dash = {
        "Name": "",
        "DashboardCustomize": [{
            "Grid": "",
            "Width": "",
            "DashboardClasses": "",
            "Image": "",
            "GroupAccess": [{}],
            "Variables": [{
                "VarName" : "",
                "Initial Value" : "",
            }],
            "Context": "",
            "DragDropConcurrent":""
        }],
        "Board": [{
            "BoardCustomize": [{
                "BoardClasses": "",
                "Image": ""
            }],
            "Component": []
        }],
    };

    dash.instanceId = "" + raw_dashboard.id //needed to build $file url
    raw_dashboard.fields.reduce(collect, dash);

    const ComponentsTemplates = {
        "Mermaid" : {
            "MermaidCustomize" : [{
                "LinkClasses" : "",
                "DiagramClasses" : ""
            }],
            "Process" : "",
        },
        "Markdown": {
            "MDContent" : "",
            "MarkdownCustomize": [{
                "MarkdownClasses" : "",
                "Mode" : ""
            }]
        },
        "Slides": {
            "Content" : "",
            "SlidesCustomize": [{
                "SlidesClasses" : "",
                "ConcurrentScript":"",
                "SlidesArg": [{}]
            }]
        },
        "ModalActivator" : {
            "ModalActivatorCustomize" : [{
                "ModalActivatorClasses" : ""
            }],
            "ModalBoardName": "",
            "ModalActivatorText": ""
        },
        "Label": {
            "LabelCustomize": [{
                "LabelClasses": "",
                "Image": ""
            }],
            "Label": "",
        },
        "Menu": {
            "MenuCustomize": [{
                "MenuClasses": ""
            }],
            "Text": [{
                "Link": "",
                "FilterVarName": "",
                "FilterValue": "",
                "TextCustomize": [{
                    "TextClasses": "",
                    "Icon": "",
                    "TextAttention": ""
                }],
            }],
        },
        "Totals": {
            "TotalsCustomize": [{
                "TotalsClasses": "",
                "InputVarTotals": [{}],
            }],
            "Line": [{
                "LineCustomize": [{
                    "LineClasses": "",
                    "TitleClasses": "",
                    "Behaviour":"",
                }],
                "Value": [{
                    "ValueCustomize": [{
                        "ValueClasses": "",
                        "View": "",
                        "ValueAttention": "",
                        "ValueAttentionClasses": "",
                        "Unit": "",
                    }],
                    "Style Value": "",
                    "Arg": [{}]
                }],
                "LineBehaviour": [{
                    "FilterTotalVarName":"",
                    "FilterTotalValue":"",
                    "LineLink":""
                }]
            }],
        },
        "Kibana": {
            "KibanaCustomize": [{
                "KibanaClasses": "",
                "OutputVarKibana": "",
                "InputVarKibana": [{}],
                "InputQueryKibana": "",
                "KibanaTimeField": ""
            }],
            "ShareLink": "",
        },
        "Filter": {
            "FilterCustomize": [{
                "FilterClasses": "",
                "noButton":"",
                "Placeholder": ""
            }],
            "OutputVarFilter": "",
        },
        "Calendar": {
            "CalendarCustomize": [{
                "CalendarClasses": "",
                "InputVarCalendar": [{}],
                "OutputVarCalendar": "",
                "OutputVarInterval": "",
                "MaxVisibleDayEvents": "",
                "AllowCreateInstances":"",
                "CreateDefinition":"",
                "EventViews":"",
                "StrictMode":""
            }],
            "Events": [{
                "Definition": "",
                "DateStartEventField": "",
                "DateEndEventField": "",
                "DescriptionEventField": "",
                "StateEventField": "",
                "EventsQuery": "",
                "TooltipTemplate":"",
                "AllDay":""
            }],
        },
        "List": {
            "ListCustomize": [{
                "InputVarList": [{}],
                "DefaultView": "",
                "ListClasses" : "",
                "HideRowSelection,": "",
                "HideDetailsColumn,": "",
                "HideColumnsSelector": "",
            }],
            "ListDefinition": "",
            "ListQuery": ""
        },
        "Hierarchy" : {
            "HierarchyCustomize": [{
                "HierarchyNodeClasses": "",
                "HierarchyRowClasses": "",
            }],
            "FilterHierarchy" : "",
            "InstanceFieldNameHierarchy":"",
            "InputVarHierarchy" : "",
            "DefinitionNameHierarchy" : "",
            "ParentFieldName" : "",
            "SortFieldName" : "",
            "DisplayFieldHierarchy" : "",
            "OutputVarHierarchy" : "",
        },
        "ImageViewer" : {
            "ImageViewerCustomize": [{
                "ImageViewerClasses": "",
                "ImageViewerButtonClasses":"",
                "ImageViewerIdentifier":"",
                "Enable Buttons":""
            }],
            "OutputVarImageViewer":"",
            "ImageViewerURL":""
        },
        "InstanceViewer" : {
            "InstanceViewerCustomize": [{
                "InstanceViewerClasses": "",
                "NoInstanceClasses": "",
                "InstanceViewerIdentifier":"",
                "HideSidenav": ""
            }],
            "InstanceViewerInstanceId":"",
            "InstanceViewerOutputVar":""
        }
    }

    for( let board of dash["Board"]) {
        board["Dash"] = { id: dash.instanceId, name: dash.Name }
        let componentsList = clone([])
        for( let component of board["Component"]) {
            if(component["Component"] == null) continue
            let componentTemplate = clone(ComponentsTemplates[component["Component"]])
            componentTemplate.instanceId = "" + raw_dashboard.id //needed to $build file url
            component.fields.reduce(collect, componentTemplate)
            componentTemplate["Component"] = component.Component
            // Assign the field identifier as the componentId
            componentTemplate.id = component.id
            componentsList.push(componentTemplate)
        }
        board["Component"] = componentsList
    }


    // remove all 'Initial_Templates','instanceId' added for processing and also all empty fields
    dash = JSON.parse(JSON.stringify(dash, (k, v) => (k === 'Initial_Template') ? undefined : v))
    dash = JSON.parse(JSON.stringify(dash, (k, v) => (k === 'instanceId') ? undefined : v))
    dash = JSON.parse(JSON.stringify(dash, (k, v) => (v === null) ? undefined : v))
    dash.instanceId = "" + raw_dashboard.id //needed to build $file url
    dash.version = "" + raw_dashboard.version //needed to build $file url


    return dash
}

export {parseDashboard, clone, collect}