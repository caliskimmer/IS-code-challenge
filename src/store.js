import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import uuidv1 from 'uuid/v1';
import * as moment from 'moment';
import * as dotenv from 'dotenv';

dotenv.config();

Vue.use(Vuex)

import { API_ENDPOINT } from './config';

export default new Vuex.Store({
    state: {
        // TODO don't use testData
        events: {},
        basicToken: false
    },
    mutations: {
        submitBasicToken: function( state, token ) {
            state.basicToken = `basic ${token}`;
        },
        updateList: function( state, list ) {
            state.events = list;
        }
    },
    getters: {
        getNumEvents: (state) => {
            return Object.keys(state.events).reduce((sum, key) => {
                sum += Object.keys(state.events[key].events).length;
                return sum;
            }, 0);
        }
    },
    actions: {
        deleteEvent: function( { commit, state }, { eventId, day} ) {
          return axios({
            method: 'DELETE',
            url: `${API_ENDPOINT}/delete/${eventId}`,
            headers: { authorization: state.basicToken },
            data: { dateTime: moment(day).toISOString() }
          });
        },
        modifyEvent: function( { commit, state }, payload ) {
          const changes = {
              name: payload.name,
              duration: payload.duration,
              brief: payload.brief,
              dateTime: payload.dateTime,
              oldTime: (payload.dateTime !== payload.oldTime) ? payload.oldTime : null
          };

          return axios({
            method: 'PUT',
            url: `${API_ENDPOINT}/update/${payload.id}`,
            data: changes,
            headers: { authorization: state.basicToken }
          });
        },
        createEvent: function( { commit, state }, calendarEvent ) {
          calendarEvent.id = uuidv1();
          return axios({
            method: 'POST',
            url: `${API_ENDPOINT}/create`,
            data: calendarEvent,
            headers: { authorization: state.basicToken }
          });
        },
        checkBasicToken: function( { commit, state }, token ) {
          return axios({
            method: 'GET',
            url: `${API_ENDPOINT}/check`,
            headers: { authorization: `basic ${token}` }
          });
        },
        getList: function( { commit, state } ) {
          axios({
            method: 'GET',
            url: `${API_ENDPOINT}/list`,
            headers: {
                authorization: state.basicToken,
                'X-API-KEY': process.env.API_KEY
            }
          }).then( res => {
            commit( 'updateList', res.data.events );
          });
        }
    }
})
