<template>
    <a @click="$emit('show-modal', modal)" :class="classes" v-html="label"></a>
</template>


<script>
export default {    
    props:{
        component: Object
    },
    computed: {
        options()  {  return this.component['ModalActivatorCustomize'][0] },
        classes()  {  return this.options['ModalActivatorClasses'] || "cursor-pointer text-blue-400 text-sm underline" },
        modal()    {  return this.component['ModalBoardName'] },
        label()    {  return this.component['ModalActivatorText'] },
    }
}
</script>