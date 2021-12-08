const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv").config();
const database = require("./database");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/api/contact", (request, response) => {
  const data = request.body;
  console.log(data);
  const db = database.getDatabaseInstance();
  const result = db.insertNewContact(data);
  result.then((id) => response.json({ id: id })).catch((err) => console.log(err));
});

app.get("/api/getContactById/:id", (request, response) => {
  const { id } = request.params;
  const db = database.getDatabaseInstance();
  const result = db.getContactById(id);
  result.then((data) => response.json(data[0])).catch((err) => console.log(err));
});

app.get("/api/getAllContacts", (request, response) => {
  const db = database.getDatabaseInstance();
  const result = db.getAllContacts();
  result.then((data) => response.json(data)).catch((err) => console.log(err));
});

app.post("/api/updateContact", (request, response) => {
  const data = request.body;
  const id = request.body.id;
  delete data.id;
  const db = database.getDatabaseInstance();
  const result = db.updateContactById(id, data);
  result.then((data) => response.json(data)).catch((err) => console.log(err));
});

app.delete("/api/contact/:id", (request, response) => {
  const { id } = request.params;
  const db = database.getDatabaseInstance();
  const result = db.deleteContactById(id);
  result.then((data) => response.json({ success: data })).catch((err) => console.log(err));
});

app.get("/api/searchContacts/:string", (request, response) => {
  const { string } = request.params;
  const db = database.getDatabaseInstance();
  const result = db.searchContacts(string);
  result.then((data) => response.json(data)).catch((err) => console.log(err));
});

app.listen(process.env.PORT);
