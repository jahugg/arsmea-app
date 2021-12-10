const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv").config();
const database = require("./database");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/api/contact", async (request, response) => {
  const data = request.body;
  const db = database.getDatabaseInstance();
  const contactId = await db.insertNewContact(data);
  response.json({ id: contactId });
});

app.get("/api/getContactById/:id", async (request, response) => {
  const { id } = request.params;
  const db = database.getDatabaseInstance();
  const data = await db.getContactById(id);
  response.json(data[0]);
});

app.get("/api/getAllContacts", async (request, response) => {
  const db = database.getDatabaseInstance();
  const contactList = await db.getAllContacts();
  response.json(contactList);
});

app.post("/api/updateContact/:id", async (request, response) => {
  const { id } = request.params;
  const data = request.body;
  delete data.id;
  const db = database.getDatabaseInstance();
  const result = await db.updateContactById(id, data);
  response.json(result);
});

app.delete("/api/contact/:id", async (request, response) => {
  const { id } = request.params;
  const db = database.getDatabaseInstance();
  const result = await db.deleteContactById(id);
  response.json({ success: result });
});

app.get("/api/searchContacts/:string", async (request, response) => {
  const { string } = request.params;
  const db = database.getDatabaseInstance();
  const result = await db.searchContacts(string);
  response.json(result);
});

app.listen(process.env.PORT);
