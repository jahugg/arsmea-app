const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const dbService = require("./dbService");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// create
app.post("/insert", (request, response) => {
  const { name } = request.body;
  const db = dbService.getDBServiceInstance();

  const result = db.insertNewName(name);
  result.then((data) => response.json({ data: data })).catch((err) => console.log(err));
});

// read
app.get("/getAll", (request, response) => {
  const db = dbService.getDBServiceInstance();
  const result = db.getAllData();

  result.then((data) => response.json({ data: data })).catch((err) => console.log(err));
});

// update
app.patch("/update", (request, response) => {
  const { id, firstname } = request.body;
  const db = dbService.getDBServiceInstance();
  const result = db.updateNameById(id, firstname);

  result.then((data) => response.json({ success: data })).catch((err) => console.log(err));
});

// delete
app.delete("/delete/:id", (request, response) => {
  const { id } = request.params;
  const db = dbService.getDBServiceInstance();
  const result = db.deleteRowById(id);

  result.then((data) => response.json({ success: data })).catch((err) => console.log(err));
});

// search
app.get("/search/:firstname", (request, response) => {
  const { firstname } = request.params;
  const db = dbService.getDBServiceInstance();
  const result = db.searchByName(firstname);

  result.then((data) => response.json({ data: data })).catch((err) => console.log(err));
});

app.listen(process.env.PORT);
