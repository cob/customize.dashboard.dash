<template>
    <a @click="$emit('show-modal', modal)" :class="classes">{{ modal }}</a>
</template>


<script>
export default {    
    props:{
        component: Object
    },
    created() {
        console.log("dash", this); 
    },
    computed: {
        options()  {  return this.component['ModalActivatorCustomize'][0] },
        classes()  {  return this.options['ModalActivatorClasses'] || "cursor-pointer text-blue-400 text-sm underline" },
        modal()    {  return this.component['ModalBoardName'] },
    }
}
</script>