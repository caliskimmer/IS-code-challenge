# IS-code-challenge

### Project setup
* Clone this repository
* Install dependencies
* Switch to node 12 or greater (use nvm or download node 12)
  * Warning: Project does not work using any version of node less than 12.0.0 (as tested)
```
(optional) nvm use 12
npm install
```
* You must create a .env file and place a copy under /src and another under /src/api! This will not work without these!
```
API_KEY=<Your API key here>
API_URL=https://crud-api.azurewebsites.net/api
```
### Getting Started
For purposes of this assignment, both backend and front-end are separate and use the dev
server. I have not optimized anything nor have prepared the code for deployment to a host
```
// serve front-end for development
npm run serve
```

```
// serve back-end for development
cd $PROJECT_DIRECTORY/src/api
node server.js
```
