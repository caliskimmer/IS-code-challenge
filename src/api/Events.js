'use strict';
const axios = require('axios');
const Moment = require('moment');
const MomentRange = require('moment-range');
const uuidv4 = require('uuid/v4');

module.exports = class Events {
    constructor() {
        this.moment = MomentRange.extendMoment(Moment);
        this.headers = {
            headers: {
                'X-API-KEY': process.env.API_KEY,
                'Content-Type': 'application/json'
            }
        };
    }

    _eventsOverlap = (targetEvent, events) => {
        let targetTime = this.moment(targetEvent.dateTime);
        let targetEndTime = targetTime.clone().add(targetEvent.duration, 'minutes');
        let targetRange = this.moment.range(targetTime, targetEndTime);

        // days is constant and miniscule so this is O(N) and should operate
        // more like a single for loop
        for (const day of Object.keys(events)) {
            for (const id of Object.keys(events[day].events)) {
                if (targetEvent.id === id) {
                    continue;
                }

                const event = events[day].events[id];
                let eventTime = this.moment(event.dateTime);
                let eventEndTime = eventTime.clone().add(event.duration, 'minutes');
                let eventRange = this.moment.range(eventTime, eventEndTime);
                if (targetRange.overlaps(eventRange)) return true;
            }
        }

        return false;
    }

    _createEvent = (day, event, events) => {
        return {
            'data': {
                ...events,
                [day]: {
                    ...events[day],
                    events: {
                        ...events[day].events,
                        [event.id]: event
                    }
                }
            }
        };
    }

    _moveEvent = (oldDay, newDay, event, events) => {
        // fetch old event
        const oldEvent = events[oldDay].events[event.id]

        // merge with new event
        const newEvent = {...oldEvent, ...event};

        // return object that deletes old event and adds new one
        return {
            'data': {
                ...events,
                [oldDay]: {
                    ...events[oldDay],
                    events: {
                        ...Object.keys(events[oldDay].events).reduce((obj, key) => {
                            if (key !== event.id) obj[key] = events[oldDay].events[key];
                            return obj;
                        }, {})
                    }
                },
                [newDay]: {
                    ...events[newDay],
                    events: {
                        ...events[newDay].events,
                        [event.id]: newEvent
                    }
                }
            }
        };
    }

    _updateEvent = (day, event, events) => {
        return {
            'data': {
                ...events,
                [day]: {
                    ...events[day],
                    events: {
                        ...events[day].events,
                        [event.id]: {...events[day].events[event.id], ...event}
                    }
                }
            }
        };
    }

    _deleteEvent = (day, event, events) => {
        return {
            'data': {
                ...events,
                [day]: {
                    ...events[day],
                    events: {
                        ...Object.keys(events[day].events).reduce((obj, key) => {
                            if (key !== event.id) obj[key] = events[day].events[key];
                            return obj;
                        }, {})
                    }
                }
            }
        };
    }

    _fetchEvents = async () => {
        let response;
        let events;
        try {
            response = await axios.get(`${process.env.API_URL}/read/events`, this.headers);
            events = response.data.message;
        } catch (err) {
            throw new Error(err);
        }

        return events;
    }

    create = async (req, res) => {
        // validate mandatory fields are filled in
        if (!req.body.name) {
            return res.status(200).json({
                success: false,
                reason: 'Name is missing'
            });
        }
        if (!req.body.dateTime) {
            return res.status(200).json({
                success: false,
                reason: 'DateTime is missing'
            });
        }
        if (!req.body.duration) {
            return res.status(200).json({
                success: false,
                reason: 'Duration is missing'
            });
        }

        let event = {
            id: uuidv4(),
            name: req.body.name,
            dateTime: req.body.dateTime,
            duration: req.body.duration
        };

        // if description included
        if (req.body.brief) {
            event.brief = req.body.brief;
        }

        // retrieve all events for given day
        let events;
        try {
            events = await this._fetchEvents();
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                reason: 'Internal error'
            });
        }

        // check for event overlap
        if (this._eventsOverlap(event, events)) {
            return res.status(200).json({
                success: false,
                reason: 'Events overlap'
            });
        }

        const time = this.moment(event.dateTime);
        const day = time.startOf('day').add(time.utcOffset(), 'minutes').toISOString();

        // check for invalid day
        if (!(day in events)) {
            return res.status(200).json({
                success: false,
                reason: 'Invalid day provided'
            });
        }

        // create event if no overlap
        const modified = this._createEvent(day, event, events);
        await axios.put(`${process.env.API_URL}/update/events`, modified, this.headers);

        return res.status(200).json({
            success: true
        });
    }

    delete = async (req, res) => {
        // validate body
        if (!req.body.dateTime) {
            return res.status(200).json({
                success: false,
                reason: 'DateTime is missing'
            });
        }

        // fetch events
        let events;
        try {
            events = await this._fetchEvents();
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                reason: 'Internal error'
            });
        }

        const event = {id: req.params.id, dateTime: req.body.dateTime};
        const time = this.moment(event.dateTime);
        const day = time.startOf('day').add(time.utcOffset(), 'minutes').toISOString();
        // check if event exists, otherwise error out
        if (!(day in events)) {
            return res.status(200).json({
                success: false,
                reason: 'Invalid day provided'
            });
        }
        if (!(event.id in events[day].events)) {
            return res.status(200).json({
                success: false,
                reason: 'Event requested does not exist'
            });
        }

        // update store without the deleted event
        const modified = this._deleteEvent(day, event, events);
        await axios.put(`${process.env.API_URL}/update/events`, modified, this.headers);

        return res.status(200).json({
            success: true
        });
    }

    update = async (req, res) => {
        // add modified fields to event object
        let event = {};
        if (req.body.name) event.name = req.body.name;
        if (req.body.duration) event.duration = req.body.duration;
        if (req.body.brief) event.brief = req.body.brief;
        event.id = req.params.id;

        // verify mandatory fields
        if (!req.body.dateTime) {
            return res.status(200).json({
                success: false,
                reason: 'dateTime not provided'
            })
        }

        event.dateTime = req.body.dateTime;

        // fetch field from store
        let events;
        try {
            events = await this._fetchEvents();
        } catch(err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                reason: 'Internal error'
            });
        }

        // fetch old day if necessary, otherwise, newDay will be the same
        const newTime = this.moment(event.dateTime);
        const newDay = newTime.startOf('day').add(newTime.utcOffset(), 'minutes').toISOString();
        const oldTime = req.body.oldTime ? this.moment(req.body.oldTime) : newTime;
        const oldDay = req.body.oldTime
            ? oldTime.startOf('day').add(oldTime.utcOffset(), 'minutes').toISOString()
            : newDay;

        // check for invalid new date
        if (!(newDay in events)) {
            return res.status(200).json({
                success: false,
                reason: 'Invalid date chosen'
            });
        }

        // check for missing event
        if (!(event.id in events[oldDay].events)) {
            return res.status(200).json({
                success: false,
                reason: 'Event does not exist'
            });
        }

        // check timeslot validity
        if (this._eventsOverlap(event, events)) {
            return res.status(200).json({
                success: false,
                reason: 'Events overlap'
            });
        }

        // merge changes with object, moving to another object if necessary
        const modified = (oldDay !== newDay)
            ? this._moveEvent(oldDay, newDay, event, events)
            : this._updateEvent(newDay, event, events);
        await axios.put(`${process.env.API_URL}/update/events`, modified, this.headers);

        return res.status(200).json({
            success: true
        });
    }

    read = async (req, res) => {
        // verify dateTime is present
        if (!req.query.dateTime) {
            return res.status(200).json({
                success: false,
                reason: 'dateTime is missing'
            })
        }

        // fetch events
        let events;
        try {
            events = await this._fetchEvents();
        } catch(err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                reason: 'Internal error'
            })
        }

        // verify event in events
        const time = this.moment(req.query.dateTime).utc();
        const day = time.startOf('day').toISOString();
        if (!(day in events)) {
            return res.status(200).json({
                success: false,
                reason: 'Incorrect day provided'
            });
        }
        if (!(req.params.id in events[day].events)) {
            return res.status(200).json({
                success: false,
                reason: 'Event not found'
            })
        }

        return res.status(200).json({
            success: true,
            event: events[day].events[req.params.id]
        });
    }

    list = async (req, res) => {
        // fetch events
        let events;
        try {
            events = await this._fetchEvents();
        } catch(err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                reason: 'Internal error'
            })
        }

        return res.status(200).json({
            success: true,
            events: events
        });
    }
};