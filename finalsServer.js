const { Configuration, OpenAIApi } =  require("openai");
const { MongoClient, ServerApiVersion } = require('mongodb');
process.stdin.setDefaultEncoding("utf-8");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, './.env') });
const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION;
const databaseAndCollection = {db: dbName, collection: collectionName};
const apikey = process.env.OPENAI_API_KEY;
const orgname = process.env.OPENAI_ORG;

const express = require("express");
const http = require('http');
const bodyParser = require('body-parser');
const app = express();

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: false}));





const portNumber = 8080;
process.stdout.write(`Web server started and running at http://localhost:${portNumber}\n`);
process.stdout.write("Stop to shut down the server: ");
process.stdin.on("readable", function(){
  let input = process.stdin.read();
  if(input !== null){
      let command = input.toString().trim();
      if(command === "stop"){
          process.stdout.write("Shutting down the server");
          process.exit(0);
      } else {
          process.stdout.write("Invalid Command\n");
          process.stdout.write("Stop to shut down the server: ");
          process.stdin.resume();
      }
  }
});

const got = require('got');

async function generateResponse(prompt){
  const url = 'https://api.openai.com/v1/engines/davinci/completions';
  const params = {
    "prompt": prompt,
    "max_tokens": 225,
    "temperature": 0.9,
    "frequency_penalty": 0.9
  };
  const headers = {
    'Authorization': `Bearer ${apikey}`,
  };

  try {
    lastPrompt = prompt;
    const response = await got.post(url, { json: params, headers: headers }).json();
    output = `${response.choices[0].text}`;
    lastResponse = output;
    const dbObject = {prompt: prompt, response: output};
    addToDB(dbObject);
    
  } catch (err) {
    console.error(err);
  }
}
let lastResponse = "";
let lastPrompt = "";
let listPrevious;
async function insertData(client, databaseAndCollection, data){
  const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(data);
}

async function addToDB(data){
  const uri = `mongodb+srv://${username}:${password}@cmsc335.wxl3shw.mongodb.net/?retryWrites=true&w=majority`;
  const client = new MongoClient(uri, {useNewUrlParser: true, serverApi: ServerApiVersion.v1});
  try{
    await client.connect();
    await insertData(client, databaseAndCollection, data);
  } catch (e){
    console.error(e);
  } finally{
    await client.close();
  }
}

async function loopupPrevious(){
  const uri = `mongodb+srv://${username}:${password}@cmsc335.wxl3shw.mongodb.net/?retryWrites=true&w=majority`;
  const client = new MongoClient(uri, {useNewUrlParser: true, serverApi: ServerApiVersion.v1});
  try{
    await client.connect();
    let filter = {};
    const cursor = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).find(filter, [0,1,1]);
    const result = await cursor.toArray();
    if(result){
      listPrevious = result;
    }
  } catch (e){
    console.error(e);
  } finally{
    await client.close();
  }
}

function printPrevious(list){
  output = "";
  list.forEach(object => {
    output += `Prompt: ${object.prompt} <br><br> Response: ${object.response}<br><br><br><hr>`;
  });
  return output;
}
app.get("/", function(request, response){
  response.render('index');
});

app.get("/form", function(request, response){
  response.render('form');
});

app.post("/form", function(request, response){
  let {prompt} = request.body;
  generateResponse(prompt).then(data => {
    response.redirect('/displayResponse');
  })
});

app.get('/displayResponse', function(request, response){
  const variables = {prompt: lastPrompt, response: lastResponse};
  response.render('displayOutput', variables);
});

app.get("/previousResponses", function(request, response){
  loopupPrevious().then(data => {
    let variables = {responses: printPrevious(listPrevious)};
    response.render("previousResponses", variables);
  });

});

app.listen(portNumber);