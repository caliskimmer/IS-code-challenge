const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 8081;

// initialize dotenv
require('dotenv').config();

// middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

const routes = require('./routes/routes.js');
app.use('/api', routes);

app.listen(port, () => console.log(`Server listening on port ${port}`));