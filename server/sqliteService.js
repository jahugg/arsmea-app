import Database from "better-sqlite3";

export default class DBService{
  static db;
  constructor() {
    this.db = this.db ? this.db : new Database("./database.db");
  }

  async insertContact(data) {
    try {
      const { firstname, lastname, company, address, email, tel, notes } = data;
      const query = this.db.prepare(`INSERT INTO contacts (date_added, firstname, lastname, company, address, email, phone, notes)
          VALUES (date('now'), ?, ?, ?, ?, ?, ?, ?)`);
      const result = query.run(firstname, lastname, company, address, email, tel, notes);
      return result.lastInsertRowid;
    } catch (error) {
      console.log(error);
    }
  }

  async selectContactById(id) {
    try {
      const query = this.db.prepare("SELECT * FROM contacts WHERE id = ?");
      const contact = query.get(id);
      return contact;
    } catch (error) {
      console.log(error);
    }
  }

  async selectContacts() {
    try {
      const query = this.db.prepare("SELECT id, firstname, lastname, archived FROM contacts WHERE archived = 0 ORDER BY lastname");
      const contactList = query.all();
      return contactList;
    } catch (error) {
      console.log(error);
    }
  }

  async selectArchivedContacts() {
    try {
      const query = this.db.prepare("SELECT id, firstname, lastname FROM contacts WHERE archived = 1 ORDER BY lastname");
      const contactList = query.all();
      return contactList;
    } catch (error) {
      console.log(error);
    }
  }

  async updateContact(data) {
    const id = data.id;
    delete data.id;

    // delete empty entries
    Object.keys(data).forEach((key) => !data[key] && data[key] !== undefined && delete data[key]);
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);

    // cunstruct query string
    let queryString = "UPDATE contacts SET ";
    dataKeys.forEach((key, i) => {
      if (i !== 0) queryString += `, `;
      queryString += `${key} = ?`;
    });
    queryString += ` WHERE id = ${id}`;

    try {
      const query = this.db.prepare(queryString);
      const result = query.run(dataValues);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteContact(id) {
    try {
      const query = this.db.prepare("DELETE FROM contacts WHERE id = ?");
      const result = query.run(id);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async searchContacts(string) {
    try {
      const query = this.db.prepare("SELECT * FROM contacts WHERE archived = 1 AND firstname LIKE ? OR lastname LIKE ?");
      const contactList = query.all(`%${string}%`, `%${string}%`);
      return contactList;
    } catch (error) {
      console.log(error);
    }
  }

  async insertOrder(data) {
    try {
      const { contact, contactId, due, price, description } = data;
      const query = this.db.prepare(`INSERT INTO orders (contact_id, datetime_placed, datetime_due, price, description, status)
      VALUES (?, datetime('now'), ?, ?, ?, 'open')`);
      const result = query.run(contactId, due, price, description);
      return result.lastInsertRowid;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOrderById(id) {
    try {
      const query = this.db.prepare(`SELECT * FROM orders INNER JOIN contacts ON orders.contact_id=contacts.id WHERE orders.id = ?`);
      const contact = query.get(id);
      return contact;
    } catch (error) {
      console.log(error);
    }
  }

  async selectAllOrders() {
    try {
      const query = this.db.prepare(`SELECT orders.id, orders.datetime_due, orders.status, contacts.firstname, contacts.lastname
        FROM orders 
        INNER JOIN contacts 
        ON orders.contact_id=contacts.id 
        ORDER BY orders.datetime_due, orders.status`);
      const orderList = query.all();
      return orderList;
    } catch (error) {
      console.log(error);
    }
  }

  async updateOrder(data) {
    try {
      const { id, duedate, status, price, description } = data;
      const query = this.db.prepare(
        "UPDATE orders SET datetime_placed = datetime('now'), datetime_due = ?, status = ?, price = ?, description = ? WHERE id = ?"
      );
      const result = query.run(duedate, status, price, description, id);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteOrder(id) {
    try {
      const query = this.db.prepare("DELETE FROM orders WHERE id = ?");
      const result = query.run(id);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOrdersByContactId(id) {
    try {
      const query = this.db.prepare(`SELECT orders.id, orders.datetime_due, orders.status, orders.price
        FROM orders 
        INNER JOIN contacts 
        ON orders.contact_id=contacts.id 
        WHERE contacts.id = ?
        ORDER BY orders.datetime_due, orders.status`);
      const contactList = query.all(id);
      return contactList;
    } catch (error) {
      console.log(error);
    }
  }
}
