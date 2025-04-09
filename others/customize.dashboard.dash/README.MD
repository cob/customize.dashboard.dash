# COB Dashboard

### Definition Upgrades:

#### 6.81.0
Adds option to enable save buttons in instance viewer

````
ALTERED
Board > Component > [=ImageViewer] ImageViewerCustomize : $[Classes,Tag,Buttons] $multiple -> Board > Component > [=ImageViewer] ImageViewerCustomize : $[Classes,Tag,Buttons,EnableSave] $multiple
````

#### 6.74.0

```
ALTERED
Board > Component: $[Label,Menu,Totals,Kibana,Filter,Calendar,List,Mermaid,ModalActivator,Markdown,Slides,Hierarchy,Viewer,ImageViewer,InstanceViewer] $instanceDescription $style[singleColumn]

NEW
Board > Component > [=ImageViewer] ImageViewerCustomize : $[Classes,Tag,Buttons] $multiple
Board > Component > [=ImageViewer] ImageViewerCustomize > [=Classes] ImageViewerClasses : $text $default(max-h-[70vh]) Default: max-h-[70vh] $help(Classes for the image viewer container) 
Board > Component > [=ImageViewer] ImageViewerCustomize > [=Classes] ImageViewerButtonClasses : $text $default(bg-blue-600 text-stone-200 font-light  border-2 text-sm border-stone-800 px-2 py-1 hover:bg-blue-400 hover:cursor-pointer) $help(Classes for the image viewer buttons) 
Board > Component > [=ImageViewer] ImageViewerCustomize > [=Tag] ImageViewerIdentifier : Identifier for Image Viewer Component
Board > Component > [=ImageViewer] ImageViewerCustomize > [=Buttons] Enable Buttons : $multiple $[Zoom In/Out,Mode Switch,Rotate,OCR]
Board > Component > [=ImageViewer] OutputVarImageViewer : Extracted text from OCR or QR Code
Board > Component > [=ImageViewer] ImageViewerURL : Image URL

Board > Component > [=InstanceViewer] InstanceViewerCustomize : $[Classes,Tag] $multiple
Board > Component > [=InstanceViewer] InstanceViewerCustomize > [=Classes] NoInstanceClasses : $text $default(w-full text-center text-xl text-stone-400 font-bold self-center) Default: w-full text-center text-xl text-stone-400 font-bold self-center
Board > Component > [=InstanceViewer] InstanceViewerCustomize > [=Classes] InstanceViewerClasses : $text $default(flex w-full h-full max-h-[70vh]) Default: flex w-full h-full max-h-[70vh]self-center
Board > Component > [=InstanceViewer] InstanceViewerCustomize > [=Tag] InstanceViewerIdentifier : Identifier for Instance Viewer Component
Board > Component > [=InstanceViewer] InstanceViewerInstanceId : ID of the instance to show
Board > Component > [=InstanceViewer] InstanceViewerOutputVar : 
```

#### Detailed Changelog (6.74.0)
Adds two new components:
- ImageViewer: allows image viewing and performing OCR on a highlighted part of said image.
- InstanceViewer: allows viewing an instance in a dashboard.

Adds support for new dashboard customizations. The following is part of a draft of documentation for these customizations:

#### Supported Hooks
We currently support the following hooks:
- `onCreated`
- `onMounted`
- `onUpdated`
- `onBeforeDestroy`

#### Dash Customizations
To set up a dashboard JavaScript customization, follow these steps:

1. Create a new file in `/recordm/customUI/js/customizations`.
2. Initialize your code (JavaScript) with the lifecycle hooks where you wish to run custom logic:
    ```javascript
    const my_code = {
        onMounted: ({ dashContainer, dashContext, eventBus }) => {
            // Custom logic for onMounted
        },

        onUpdated: ({ dashContainer, dashContext, eventBus }) => {
            // Custom logic for onUpdated
        },

        // Other hooks...

        onBeforeDestroy: ({ dashContainer, dashContext, eventBus }) => {
            // Custom logic for onBeforeDestroy
        }
    };

    CoBDashCustomizations.registerDashCustomization("Dashboard Name", my_code);
    ```
3. Register your custom JavaScript file in `/recordm/customUI/js/customizations2.js`.

#### Lifecycle Hooks Parameters
| Parameter     | Description                                                                 |
|---------------|-----------------------------------------------------------------------------|
| `dashContainer` | Contains the dashboard DOM container.                                      |
| `dashContext`   | The Dashboard Vue component object. Access the dashboard component state, methods, and child components. |
| `eventBus`      | An event bus. Listen for events fired by components and run logic accordingly. |

Note: Since `eventBus` is a Vue event bus, you can add listeners to it like this:
```
eventBus.$on("Event Name", myEventHandlerFunction);
```

#### Existing Events
| Component       | Event             | Description                                                   | Event Data                                                                                          |
|-----------------|-------------------|---------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| Image Viewer    | `imageviewer-ocr` | Fired when OCR is run on this component.                      | **details**: { **ocrText**: The text decoded via OCR; **cropData**: The bounding box coordinates; **confidence**: Confidence of the extracted text value. } |
| Instance Viewer | `field-focus`     | Fired when a field is focused (highlighted, clicked, etc.).   | **detail**: { **instancePresenter**: The instance presenter; **field**: The field presenter for the focused field. } |

All event data also includes:
- **senderUID**: The Vue component UUID of the sender.
- **componentIdentifier**: The component identifier (if specified at the dashboard level).

---

#### 6.70.1
Re-import `Home` dashboard_v1 instance (instances/dashboardhome_v6.63.0.xlsx) Or do it by hand : 
Update the `Home` dashboard instance: check the LabelCustomize `classes` checkbox and add a LabelClass 'invisible' to the Label component that has the content 'script:window.location.replace...'

#### 6.70.0

* Dashboard-Solutions:

```
NEW (After field `Descrição`)
* Documentação : $markdown $style[mdPreview]
```
Update instance dashboard chooser

#### 6.63
- Added missing "ListClasses" to customize list component

```
ALTERED
* Board > Component > [=List] ListCustomize : $[InputVar,SetDefaultView,ShowViews,ShowActions,ShowImport,CreateAndDelete] $multiple $help[Select the defaults to change] -> $[InputVar,SetDefaultView,ShowViews,ShowActions,ShowImport,CreateAndDelete,Classes] $multiple $help[Select the defaults to change]

NEW 
* Board > Component > [=List] ListCustomize > [=Classes] ListClasses : $text Default: <empty>
```

#### 6.61.0
- Added new `HeaderOnly` option to `CalendarCustomize`. This option will hide the calendar itself, and only the show the time navgiation bar, with arrow keys and date pickers - it will maintain the "view types" for the calendar, which can be used to set time intervals (week, month, etc).

```
ALTERED
* Board > Component > [=Calendar] CalendarCustomize : $[Classes,InputVar,OutputVar,Settings,CropMonth] $multiple $help[Select the defaults to change] -> $[Classes,InputVar,OutputVar,Settings,CropMonth,HeaderOnly] $multiple $help[Select the defaults to change]
```

#### 6.60.0
- Added new outputVar to calendar named `outputVarInterval`. The calendar will create a variable with the given name, and will contain two properties:
  - `startDate`
  - `endDate`
These properties represent the visible interval in the dashboard.

```
NEW
* Board > Component > [=Calendar] CalendarCustomize > [=OutputVar] OutputVarInterval : $help[You can specify a name for a variable where the Calendar will insert two properties: startDate and endDate - respectively containing the current calendar's period's start and end dates in milliseconds]
```

#### 6.58.0
- Extended Hierarchy to support injecting classes in unselected rows/nodes.
- Fixed Hierarchy bug where we couldn't build the tree if we didn't start from the first level.

```
NEW
* Board > Component > [=Hierarchy] HierarchyCustomize > [=Classes] HierarchyRowClasses : [$text $default(text-stone-600) Default: text-stone-600]
```

#### 6.57.0
Extended DragDrop behavior with new keyword `dropZoneHighlight`.
Attributing this keyword to a DropZone will change the drag and drop behaviour in the following ways:
- "Live previewing" of dragged item being dropped is turned off - dragging and item will instead highlight the dropzone instead of inserting the child (like a live preview).
- When dropping, the draggedItem will stay in its original position.

This behavior is intended to be used with concurrent scripts, for cases where the dragged item and dropZones do not have a matching HTML structure - thus we wouldn't want to insert the dragged item as a child in the target dropzone.

#### 6.56.3
Removed the following duplicate fields:
```
Totals [LineCustomize=Behaviour] > LineBehaviour [=Filter] > **FilterTotalVarName**
Hierarchy > **InstanceFieldNameHierarchy**
Calendar > Events > **DateStartEventField**
```

#### 6.56.1
- Fixed conflicting field names: Arg (Totals) VS Arg (Slides)
  - Arg (Slides) field name had to be changed to SlidesArg.
```
ALTERED
* Board > Component > [=Slides] SlidesCustomize > [=EndOfContentTrigger] (Duplicable) Arg  -> * Board > Component > [=Slides] SlidesCustomize > [=EndOfContentTrigger] (Duplicable) SlidesArg   
```

#### 6.56.0
- Added functions to dashboard context: sum, average e weightedAverage

#### 6.54.1
Novos helpers para datas:
- todayTimestamp: returns today's date in timestamp
- compareDates: compares two dates. Returns integer
- compareDateTimes: Compares dates and times. Returns integer
#### 6.54.0
Dashboard-V1
- Dashboard now supports dragging and dropping items.
    - We control drag and drop using two classes: dragItem and dropZone.
      - **dragItem** is used on HTML elements we want to be able to drag INTO dropZones.
      - **dropZone** is used on HTML elements where we want to be able to drop dragItems

  - It also supports a custom concurrent script call, configured in Dashboard Customize's DragDropConcurrent property.
    - This concurrent will be called everytime a draggable item is DROPPED INSIDE A DROPZONE.
  - The parameters the concurrent receives are parsed and obtained via both the dragItems and dropZones data-attributes AND / OR classes prefixed with, respectively, 'dragItem' and 'dropZone'.


```
ALTERED
DashboardCustomize: $[Classes,Image,Width,Grid,Access,Vars,Context] $multiple $help[Select the defaults to change]  -> $[Classes,Image,Width,Grid,Access,Vars,Context,DragDrop] $multiple $help[Select the defaults to change]  

NEW
DashboardCustomize [=DragDrop] > DragDropConcurrent : $help[Specify a concurrent script to be executed when dropping draggable items.]
```

#### 6.52.0

- Added `CropMonth` option to CalendarCustomize in the Calendar component. When ticked, this option tells the Calendar component to only use the selected month.  

#### 6.41.0
Dashboard-V1
- Added `Behaviour` option to LineCustomize for the Totals Component. When choosing this option, you can choose the Line's behaviour in `LineBehaviour`: 
  - Listing -> The line acts as a regular/normal Totals' line;
  - Link -> Receives a custom link to replace the default HREF in each Value for that specific Line. Can also be used to run javascript by prefixing code w/ "javascript:";
  - Filter -> Allows us to specify a var name and its respective value, so we can use an entire Line as a Filter button.
    - `FilterTotalVarName` is used to specify the name of a variable to be stored in the dashboard.
    - `FilterTotalValue` is used to specify the value to be passed to the variable specified in `FilterTotalVarName`.

```
ALTERED
Board > Component [=Totals] > Totals > Line > LineCustomize : $[LineClasses,TitleClasses,Behaviour] $multiple $help[Select the defaults to change]

NEW
Board > Component [=Totals] > Totals > Line > LineCustomize [=Behaviour] > LineBehaviour : $[*Listing,Filter,Link] $help[Select how you want this component to behave. <br/> Listing: Default behavior <br/> Link: Every line uses a custom link and redirects upon clicking. <br/> Filter: allows the specification of a var and its value to be used across components in the dashboard.]

Board > Component [=Totals] > Totals > Line > LineCustomize [=Behaviour] > LineBehaviour [=Filter] > FilterTotalVarName : The filter variable name
Board > Component [=Totals] > Totals > Line > LineCustomize [=Behaviour] > LineBehaviour [=Filter]  > FilterTotalValue : The value of the filter $text

Board > Component [=Totals] > Totals > Line > LineCustomize [=Behaviour] > LineBehaviour [=Link] > LineLink
```

#### 6.40.0
Dashboard-V1
- Added a new `AllDay` field to the `Calendar`'s `Events`. If you specify *True* the Events will render as *All Day Events*, meaning they'll be filled (with background) instead of using only a colored dot. If False is specified, it will use the Calendar's default All Day behavior (rendering a colored dot when end_date-start_date < 24h).
```
NEW 
Board > Component > [=Calendar] Events > AllDay : $[True,*False] True if events occupy all day. False if otherwise.
```

#### 6.39.0

Dashboard-V1
- Changed the `Vars` field in the dashboard for a duplicable group `Variables` with two child fields: `Name` and `Initial Value`. These define the initial value the variable will be associated to when the dashboard loads for the first time. 
```
ALTERED
DashboardCustomize [=Vars] > Variables (Duplicable) $group 
DashboardCustomize [=Vars] > Variables (Duplicable) > VarName 
DashboardCustomize [=Vars] > Variables (Duplicable) > Initial Value

REMOVED 
DashboardCustomize [=Vars] > VarName 
```

#### 6.35.0 
Dashboard-V1
- Added new `DisplayFieldHierarchy` field to Hierarchy component. This allows the user to display a specific field in the listing of hierarchies. It can be left empy, in which case the component defauls to the instance label.

```
NEW 
Board > Component > [=Hierarchy] > DisplayFieldHierarchy 
```

#### 6.34.1
Dashboard-V1
- Added new `InstanceFieldNameHierarchy` field to Hierarchy component. This field lets the user specify the name of a field that should be used to set the OutputVarHierarchy's value. If this field is not specified, the Hierarchy component will output the entire instance object instead.
- Corrected default values in `HierarchyNodeClasses` (removed wrong "hierarchy selected " class).
- Corrected a field description in the README's previous version (6.33.0 - HierarchyNodeClasses)

```
ALTERED 
Board > Component > [=Hierarchy] HierarchyCustomize > [=Classes] HierarchyNodeClasses : $text $default(text-red-500 font-bold) Default: text-red-500 font-bold

NEW
Board > Component > [=Hierarchy] > InstanceFieldNameHierarchy : $help[You can specify a instance's field name to output its value instead of the entire object.]
```

#### 6.33.0
Dashboard-V1
- New Component `Hierarchy` allows the hierarchical display of instances. Instances of the hierarchy must have a parent field `$ref` that points to the same instance. This displays the structure similarly to a sidebar. Each element can be clicked, and the selected instance is placed in the given output variable.

``` 
ALTERED
Board > Component: $[Label,Menu,Totals,Kibana,Filter,Calendar,List,Mermaid,ModalActivator,Markdown,Slides,Hierarchy] $instanceDescription $style[singleColumn]

NEW
Board > Component > [=Hierarchy] HierarchyCustomize : $[Classes] $multiple $help[Select the defaults to change]
Board > Component > [=Hierarchy] HierarchyCustomize > [=Classes] HierarchyNodeClasses : $text $default(text-red-500 font-bold  hierarchy-selected) Default: text-red-500 font-bold  hierarchy-selected
Board > Component > [=Hierarchy] InputVarHierarchy
Board > Component > [=Hierarchy] OutputVarHierarchy
Board > Component > [=Hierarchy] ParentFieldName 
Board > Component > [=Hierarchy] SortFieldName
Board > Component > [=Hierarchy] DefinitionNameHierarchy 
Board > Component > [=Hierarchy] FilterHierarchy
``` 

#### 6.32.0
Dashboard-V1
- Added Event Field "TooltipTemplate". This allows us to dynamically control the format of the tooltip with HTML template, with piped-handlebars ({|{) for loops/access to variables.
```
* Board > Component > [=Calendar] Events > TooltipTemplate : $text
```

#### 6.31.0
Dashboard-V1
- Updated description of the field "StateEventField" in calendar events:
```
* Board > Component > [=Calendar] Events > StateEventField : Name of the field to calculate the color for the event. If not defined it will use always the same color for all events. If starts with "#" that hex color will be used. If starts with "bg:" then it'll fill the background of that day with the color
```

#### 6.30.0
Dashboard-V1
* New Option `EscapeSpecialChars` in Filter component and help text change

```
* Board > Component > [=Filter] FilterCustomize : $[Classes,noButton,Placeholder,EscapeSpecialChars] $multiple $help[Select the defaults to change<br><br><b>EscapeSpecialChars:</b> Escapes ElasticSearch chars in the filter]
```


#### 6.29.2
Dashboard-V1
```
RENAME :
* Board > Component > [=Markdown] Content -> MDContent
```

#### 6.29.1
Dashboard-V1
* New Option Slides in List

```
* Board > Component : $[Label,Menu,Totals,Kibana,Filter,Calendar,List,Mermaid,ModalActivator,Markdown] $instanceDescription $style[singleColumn]  $[Label,Menu,Totals,Kibana,Filter,Calendar,List,Mermaid,ModalActivator,Markdown,Slides] $instanceDescription $style[singleColumn]
```

#### 6.29.0

* `App.vue`, `Board.vue`, `Dashboard.vue` will now pass "refreshQuery" events down to children. Required by `Slides.vue`.
* Added new Slides component that can parse Markdown and turn it into a presentation, using RevealJS
  * Supports fullscreen (F), overview mode (O) and arrow keys.
  * Includes EndOfContentTrigger customization that dynamically receives arguments and the name of a concurrent script - allowing the creation of custom groovy scripts that run when the content is marked as seen.

* Changed Dashboard definition:
  * Added Slides component
  * Removed ref from mermaid
  * Added label field to activator

```
* Board > Component > [=Slides] Content : $markdown
* Board > Component > [=Slides] SlidesCustomize : $[Classes,EndOfContentTrigger] $multiple
* Board > Component > [=Slides] SlidesCustomize > [=Classes] SlideClasses : $text  $default(text-justify text-gray-700) Default: text-justify text-gray-700
* Board > Component > [=Slides] SlidesCustomize > [=EndOfContentTrigger] ConcurrentScript 
* Board > Component > [=Slides] SlidesCustomize > [=EndOfContentTrigger] (Duplicable) Arg   
* Board > Component > [=Mermaid] Process : $help[Instance ID of the business process]
* Removed comment from ModalBoardName in ModalActivator
* Board > Component > [=ModalActivator] ModalBoardName : ""
* Board > Component > [=ModalActivator] ModalActivatorText
``` 


#### 6.28.0
* New Fields in definiton Dashboard-Solutions
* changes in "chooser" dashboard instance: 2 ways to do the update
  * remove Chooser dashboard instance and import the new from `dashboard_chooser_0.28.0.xlsx`
  * OR look for "imagem" and "text_color" in the chooser instance of an updated server and copy the new values for the server being updated
```
NOVOS CAMPOS:
Imagem -> Default:none $image 
Text Color
```

#### 6.27.0
* New Option ShowImport in List
```
* Board > Component > [=List] ListCustomize : $[InputVar,SetDefaultView,ShowViews,ShowActions,ShowImport,CreateAndDelete] $multiple $help[Select the defaults to change] 
```

#### 6.25.0
* Re-add the Filter option to the Menus
```
* Board > Component > [=Menu] Text > TextCustomize : $[Classes,Icon,Attention,Visibility,Filter] $multiple $help[Select the defaults to change] 
```

#### 6.24.0
* Configure kibana time field
```
* Board > Component > [=Kibana] KibanaCustomize : $[Classes,InputVar,OutputVar,Query,TimeField] $multiple $help[Select the defaults to change] 
* Board > Component > [=Kibana] KibanaCustomize > [=TimeField] KibanaTimeField : The time field used by Kibana index used to filter the records 
```

#### 6.23.0

* Three new components: Mermaid, ModalActivator, Markdown

```
* Board > BoardCustomize : $[Classes,Image,IsModal] $multiple $help[Select the defaults to change]

* Board > Component : $[Label,Menu,Totals,Kibana,Filter,Calendar,List,Mermaid,ModalActivator,Markdown] $instanceDescription $style[singleColumn]
* Board > Component > [=Label] Label : $text
* Board > Component > [=Filter] FilterCustomize : $[Classes,noButton,Placeholder] $multiple $help[Select the defaults to change]

* Board > Component > [=Mermaid] MermaidCustomize : $[LinkClasses,DiagramClasses] $multiple $help[Select the defaults to change]
* Board > Component > [=Mermaid] MermaidCustomize > [=LinkClasses] LinkClasses : $text
* Board > Component > [=Mermaid] MermaidCustomize > [=DiagramClasses] DiagramClasses : $text
* Board > Component > [=Mermaid] MermaidCustomize > Process : $ref(Business Processes, *)

* Board > Component > [=ModalActivator] ModalActivatorCustomize : $[Classes] $multiple $help[Select the defaults to change]
* Board > Component > [=ModalActivator] ModalActivatorCustomize > [=Classes] ModalActivatorClasses : $text $default(cursor-pointer text-blue-400 text-sm underline) default: cursor-pointer text-blue-400 text-sm underline
* Board > Component > [=ModalActivator] ModalActivatorCustomize : $[Classes] $multiple $help[Select the defaults to change]

* Board > Component > [=Markdown]  MarkdownCustomize : $[Classes,Mode] $multiple $help[Select the defaults to change]
* Board > Component > [=Markdown]  MarkdownCustomize > [=Classes] MarkdownClasses : $text $default(text-justify text-gray-700) Default: text-justify text-gray-700
* Board > Component > [=Markdown]  MarkdownCustomize > [=Mode] Mode : $[*Light,Dark] $radio
* Board > Component > [=Markdown] MarkdownCustomize > Content : $markdown
```