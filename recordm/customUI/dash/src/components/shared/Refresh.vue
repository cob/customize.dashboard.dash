<!-- From inspecting https://tailwindcss.com/docs/animation#spin example -->
<template>
  <button type="button" class="mt-2 mr-1" @click="debounceRefresh">

    <svg xmlns="http://www.w3.org/2000/svg"  :class="this.refreshClasses" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clip-rule="evenodd" />
    </svg>
  </button>
</template>

<script>
  export default {
    props: {
      updating: true
    },
    computed: {
      refreshClasses() {
        let defaultClasses = "w-5 h-5 w-auto text-slate-400 !text-red-500 transition cursor-pointer hover:text-red-500 "
        if (cob.app.getSettings().mode() === "naked") {
          let nakedClasses = "w-10 h-10 w-auto text-slate-400 !text-red-500 transition cursor-pointer hover:text-red-500 "
          return [...nakedClasses.split(), this.updating ? 'animate-spin' : "" ]
        } 
        return [...defaultClasses.split(), this.updating ? 'animate-spin' : "" ]
      }
    },
    methods: {
      askRefresh() {
        if(this.updating) { return }
        this.$emit('refresh');
        window.dispatchEvent(new Event("cobRefreshMenu"));
      },
      debounceRefresh() {
      if (this.refreshTimer) { return }

      this.askRefresh();

      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null
      }, 1200)
    }
    }
  }
</script>
