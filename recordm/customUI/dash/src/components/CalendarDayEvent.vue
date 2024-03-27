<script>
export default {
    props: {
        event : Object,
        color : String 
    },
    methods: {
      isSingleDay(event) {
          const start = new Date(Date.parse(event.start));
          start.setDate(start.getDate() + 1)
          const end = new Date(Date.parse(event.end)); 
          return start.getDate() == end.getDate() &&
                 start.getMonth() == end.getMonth() &&
                 start.getFullYear() == end.getFullYear()
        },         
    }
}
</script>

<template>
    <div class="hb-main">
        <div :class="{'hb-circle' : isSingleDay(event.event)} " >{{ event.timeText }}</div>
        <div class="hb-event-title-container">
            <div class="fc-sticky" :class="{ 'hb-event-title' : !isSingleDay(event.event)}">
                {{ event.event.title}}
            </div>
        </div>
    </div>
</template>


<style>

.hb-main {
    display: flex;
    gap: 3px;
    overflow-x: hidden;
  }

  .hb-circle {
    font-weight: bold;
  }

  .hb-event-title {
    font-weight: bold;
  }

  .hb-circle::before {
    content: "";
    margin-right: 3px;
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: v-bind(color);
    border-radius: 50%;
  }

</style>