const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv").config();
const database = require("./database");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// create
app.post("/api/insertContact", (request, response) => {
  const data = request.body;
  const db = database.getDatabaseInstance();
  const result = db.insertNewContact(data);
  result.then((id) => response.json({ id: id })).catch((err) => console.log(err));
});

app.get("/api/getContactById/:id", (request, response) => {
  const { id } = request.params;
  const db = database.getDatabaseInstance();
  const result = db.getContactById(id);
  result.then((data) => response.json(data)).catch((err) => console.log(err));
});

app.get("/api/searchContactByName/:string", (request, response) => {
  const { string } = request.params;
  const db = database.getDatabaseInstance();
  const result = db.searchContactByName(string);
  result.then((data) => response.json(data)).catch((err) => console.log(err));
});

app.post("/insert", (request, response) => {
  const { name } = request.body;
  const db = database.getDatabaseInstance();
  const result = db.insertNewName(name);
  result.then((data) => response.json(data)).catch((err) => console.log(err));
});

// read
app.get("/api/getAll", (request, response) => {
  const db = database.getDatabaseInstance();
  const result = db.getAllContacts();
  result.then((data) => response.json(data)).catch((err) => console.log(err));
});

// update
app.patch("/update", (request, response) => {
  const { id, firstname } = request.body;
  const db = database.getDatabaseInstance();
  const result = db.updateNameById(id, firstname);
  result.then((data) => response.json({ success: data })).catch((err) => console.log(err));
});

// delete
app.delete("/api/deleteContactById/:id", (request, response) => {
  const { id } = request.params;
  const db = database.getDatabaseInstance();
  const result = db.deleteContactById(id);
  result.then((data) => response.json({ success: data })).catch((err) => console.log(err));
});

// search
app.get("/search/:firstname", (request, response) => {
  const { firstname } = request.params;
  const db = database.getDatabaseInstance();
  const result = db.searchByName(firstname);
  result.then((data) => response.json({ data: data })).catch((err) => console.log(err));
});

// start server
app.listen(process.env.PORT);
