'use strict';
const express = require('express');
const router = express.Router();

const Events = require('../Events');
const Auth = require('../services/Auth.js');
const events = new Events();
const auth = new Auth();

// events
router.post('/create', events.create);
router.delete('/delete/:id', events.delete);
router.put('/update/:id', events.update);
router.get('/list', events.list);
router.get('/read/:id', events.read);

// auth
router.get('/check', auth.check);

module.exports = router;