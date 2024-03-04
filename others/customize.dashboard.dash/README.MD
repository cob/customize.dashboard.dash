# COB Dashboard

### Definition Upgrades:

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