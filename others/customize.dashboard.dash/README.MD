# COB Dashboard

### Definition Upgrades:

#### 6.30.0
Dashboard-V1
* New Option `PlainTextMode` in Filter and help text change
  ALTERADOS:
  `FilterCustomize : $[Classes,noButton,Placeholder,PlainTextMode] $multiple $help[Select the defaults to change<br><br><b>PlainTextMode:</b> Escapes ElasticSearch chars in the filter]`
*

#### 6.29.2
Dashboard-V1
```
RENAME :
 Board > Component > [=Markdown] Content -> MDContent
```

#### 6.29.1
Dashboard-V1
* New Option Slides in List
  ALTERADOS:
  Component -> $[Label,Menu,Totals,Kibana,Filter,Calendar,List,Mermaid,ModalActivator,Markdown] $instanceDescription $style[singleColumn]  $[Label,Menu,Totals,Kibana,Filter,Calendar,List,Mermaid,ModalActivator,Markdown,Slides] $instanceDescription $style[singleColumn]
*

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