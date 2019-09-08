<template>
    <div class='events' v-if="getNumEvents()">
        <Day v-for="key in Object.keys(eventDays)" :dateTime="eventDays[key].date" :eventList="eventDays[key].events"
             :key="eventDays[key].id" />
    </div>
    <div v-else class='empty'>
        <p> {{message}} </p>
    </div>
</template>

<script>

import Day from '@/components/day.vue'

export default {
    name: 'home',
    components: {
        Day
    },
    data: function(){
        return {
            message: ''
        }
    },
    mounted: function(){
        this.message = 'Loading Events...';
        this.$store.dispatch( 'getList' ).then( res => {
            if( !this.getNumEvents() ) {
              this.message = 'No Events';
            }
        }).catch( err => {
            this.$toasted.show(
              'Error Loading Events',
              {
                position: 'top-left',
                theme: 'bubble',
                type: 'error'
              }
            ).goAway( 1500 );
        });
    },
    computed: {
        eventDays() {
            return this.$store.state.events
        },
    },
    methods: {
        getNumEvents() {
            return this.$store.getters.getNumEvents;
        }
    }
}
</script>

<style>

div.empty {
    padding:1em;
    text-align:left;
}

</style>
