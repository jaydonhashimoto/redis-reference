const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

//establish redis conneciton
const client = redis.createClient(REDIS_PORT);

const app = express();

//set reponse
function setResponse(username, repos) {
  return `<h2>${username} has ${repos} Github repos</h2>`;
}

// middleware that makes request to github for data
async function getRepos(req, res, next) {
  try {
    console.log('Fetching Data...');

    const { username } = req.params;

    //call github api
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    const repos = data.public_repos;

    //set data to redis
    //setex specifies an expiration
    //client.setex(key, expiration(sec), data)
    client.setex(username, 3600, repos);

    res.send(setResponse(username, repos));
  } catch (err) {
    console.log(err);
    res.status(500);
  }
}

//cache middleware that caches data
function cache(req, res, next) {
  const { username } = req.params;

  //get username
  client.get(username, (err, data) => {
    if (err) throw err;

    //if there is data, send username with data
    if (data !== null) {
      res.send(setResponse(username, data));
    } else {
      next();
    }
  });
}

//route
app.get('/repos/:username', cache, getRepos);

app.listen(PORT, () => {
  console.log(`App listening on port: ${PORT}`);
});
