import Database from 'better-sqlite3';

/* Notes:
updates functions could probably be joined into single function */

export default class DBService {
  static db;
  constructor() {
    this.db = this.db ? this.db : new Database('./database.db');
  }

  // ==========
  // Contacts

  async insertContact(data) {
    // delete empty entries
    Object.keys(data).forEach((key) => !data[key] && data[key] !== undefined && delete data[key]);
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);

    // use array.map to process keys inidividually...

    // cunstruct query string
    let queryString = 'INSERT INTO contacts (date_added';
    dataKeys.forEach((key) => {
      queryString += `, ${key}`;
    });
    queryString += `) VALUES (date('now')`;
    dataKeys.forEach(() => {
      queryString += `, ?`;
    });
    queryString += `)`;

    try {
      const query = this.db.prepare(queryString);
      const result = query.run(dataValues);
      return result.lastInsertRowid;
    } catch (error) {
      console.log(error);
    }
  }

  async selectContactById(id) {
    try {
      const query = this.db.prepare('SELECT * FROM contacts WHERE id = ?');
      const contact = query.get(id);
      return contact;
    } catch (error) {
      console.log(error);
    }
  }

  async selectContacts() {
    try {
      const query = this.db.prepare('SELECT id, firstname, lastname, archived FROM contacts WHERE archived = 0 ORDER BY lastname COLLATE NOCASE');
      const contactList = query.all();
      return contactList;
    } catch (error) {
      console.log(error);
    }
  }

  async selectArchivedContacts() {
    try {
      const query = this.db.prepare('SELECT id, firstname, lastname FROM contacts WHERE archived = 1 ORDER BY lastname');
      const contactList = query.all();
      return contactList;
    } catch (error) {
      console.log(error);
    }
  }

  async updateContact(data) {
    const id = data.id;
    delete data.id;

    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);

    // cunstruct query string
    let queryString = 'UPDATE contacts SET ';
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
      const query = this.db.prepare('DELETE FROM contacts WHERE id = ?');
      const result = query.run(id);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async searchContacts(string) {
    try {
      const query = this.db.prepare('SELECT * FROM contacts WHERE archived = 1 AND firstname LIKE ? OR lastname LIKE ?');
      const contactList = query.all(`%${string}%`, `%${string}%`);
      return contactList;
    } catch (error) {
      console.log(error);
    }
  }

  // ==========
  // Orders
  async insertOrder(data) {
    try {
      const { contactId, due, amount, description } = data;
      let query = this.db.prepare(`INSERT INTO invoices (contact_id, amount, date_issue, date_due)
      VALUES (?, ?, date('now'), date('now','+15 day'))`);
      let result = query.run(contactId, amount);
      const invoiceId = result.lastInsertRowid;

      query = this.db.prepare(`INSERT INTO 
        orders (contact_id, invoice_id, datetime_placed, datetime_due, description, status)
      VALUES (?, ?, datetime('now'), ?, ?, 'open')`);
      result = query.run(contactId, invoiceId, due, description);
      return result.lastInsertRowid;
    } catch (error) {
      console.log(error);
    }
  }

  async insertMultipleOrders(data) {
    // data format: [{},{},{}]
    try {
      let orders = data.map((order) => [order.contact_id, order.invoice_id, order.datetime_due, order.description]);
      let placeholders = orders.map(() => '(?, ?, ?, ?)').join(', ');
      let query = this.db.prepare(`INSERT INTO orders (contact_id, invoice_id, datetime_due, description) VALUES ${placeholders}`);
      let result = query.run(...orders);
      return result.changes;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOrderById(id) {
    try {
      const query = this.db.prepare(`SELECT * FROM orders 
        INNER JOIN contacts 
          ON orders.contact_id = contacts.id
        INNER JOIN invoices
          ON orders.invoice_id = invoices.id
        WHERE orders.id = ?`);
      const order = query.get(id);
      return order;
    } catch (error) {
      console.log(error);
    }
  }

  async selectAllOrders() {
    try {
      const query = this.db.prepare(`SELECT orders.id, orders.datetime_due, orders.status, contacts.firstname, contacts.lastname
        FROM orders 
        INNER JOIN contacts 
        ON orders.contact_id = contacts.id 
        ORDER BY orders.datetime_due, orders.status`);
      const orderList = query.all();
      return orderList;
    } catch (error) {
      console.log(error);
    }
  }

  async updateOrder(data) {
    try {
      const { id, duedate, status, amount, invoiceId, description } = data;

      // update invoice
      let query = this.db.prepare(`UPDATE invoices
        SET amount = ?
        WHERE id = ?`);
      let result = query.run(amount, invoiceId);

      // update order
      query = this.db.prepare(`UPDATE orders
        SET datetime_due = ?, status = ?, description = ? 
        WHERE id = ?`);
      result = query.run(duedate, status, description, id);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteOrder(id) {
    try {
      const orderData = await this.selectOrderById(id);

      // delete order entry
      const query = this.db.prepare('DELETE FROM orders WHERE id = ?');
      const result = query.run(id);

      // delete invoice entry
      await this.deleteInvoice(orderData.invoice_id);

      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOrdersByContactId(id) {
    try {
      const query = this.db.prepare(`SELECT orders.id, orders.datetime_due, orders.status, 
          contacts.firstname, contacts.lastname, invoices.amount
        FROM orders 
        INNER JOIN contacts 
          ON orders.contact_id = contacts.id 
        INNER JOIN invoices
          ON orders.invoice_id = invoices.id
        WHERE contacts.id = ?
        ORDER BY orders.datetime_due, orders.status`);
      const orderList = query.all(id);
      return orderList;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOrdersByInvoiceId(id) {
    try {
      const query = this.db.prepare(`SELECT * 
        FROM orders
        WHERE invoice_id = ?

        ORDER BY orders.datetime_due, orders.status`);
      const orderList = query.all(id);
      return orderList;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOrdersWithinRange(startDate, endDate) {
    try {
      const query = this.db.prepare(`SELECT orders.id, orders.datetime_due, orders.status, 
        contacts.firstname, contacts.lastname, invoices.amount
        FROM orders 
        INNER JOIN contacts 
          ON orders.contact_id = contacts.id 
        INNER JOIN invoices
          ON orders.invoice_id = invoices.id
        WHERE orders.datetime_due BETWEEN ? AND ?
        ORDER BY orders.datetime_due, orders.status`);
      const ordersList = query.all(startDate, endDate);
      return ordersList;
    } catch (error) {
      console.log(error);
    }
  }

  // ==========
  // Subscriptions
  async insertSubscription(data) {
    try {
      // insert new invoice for subscription
      const { contactId, price } = data;
      let query = this.db.prepare(`INSERT INTO invoices (contact_id, amount, date_issue, date_due)
        VALUES (?, ?, date('now'), date('now','+15 day'))`);
      let result = query.run(contactId, price);
      const invoiceId = result.lastInsertRowid;

      // insert subscription
      const { dateStart, deliveryTime, interval, description } = data;
      query = this.db.prepare(`INSERT INTO subscriptions (invoice_id, datetime_placed, date_start, delivery_time, interval, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?)`);
      result = query.run(invoiceId, dateStart, deliveryTime, interval, description);
      const subscriptionId = result.lastInsertRowid;

      return { id: subscriptionId, invoiceId: invoiceId };
    } catch (error) {
      console.log(error);
    }
  }

  async selectAllSubscriptions() {
    try {
      const query = this.db.prepare(`SELECT subscriptions.id, subscriptions.date_start, subscriptions.frequency, subscriptions.interval, subscriptions.delivery_time, contacts.firstname, contacts.lastname
        FROM subscriptions
        INNER JOIN invoices
          ON subscriptions.invoice_id = invoices.id
        INNER JOIN contacts 
          ON invoices.contact_id = contacts.id 
        ORDER BY subscriptions.date_start`);
      const list = query.all();
      return list;
    } catch (error) {
      console.log(error);
    }
  }

  async selectSubscriptionById(id) {
    try {
      const query = this.db.prepare(`SELECT subscriptions.*, contacts.id AS contact_id, contacts.firstname, contacts.lastname, invoices.amount
        FROM subscriptions
        INNER JOIN invoices
          ON subscriptions.invoice_id = invoices.id
        INNER JOIN contacts 
          ON invoices.contact_id = contacts.id 
        WHERE subscriptions.id = ?
        ORDER BY subscriptions.date_start`);
      const subscription = query.get(id);
      return subscription;
    } catch (error) {
      console.log(error);
    }
  }

  // ==========
  // Invoices
  async insertInvoice(data) {
    try {
      const { contactId, issue, due, amount, description } = data;
      let query = this.db.prepare(`INSERT INTO invoices (contact_id, amount, date_issue, date_due, description)
      VALUES (?, ?, ?, ?, ?)`);
      let result = query.run(contactId, amount, issue, due, description);
      return result.lastInsertRowid;
    } catch (error) {
      console.log(error);
    }
  }

  async selectAllInvoices() {
    // Looking for a way to have conditional join cases?
    // SQL CASE probably is not doing the trick...
    try {
      const query = this.db.prepare(`SELECT invoices.id, invoices.status, invoices.amount, invoices.date_issue, invoices.date_paid, invoices.date_due,
          contacts.firstname, contacts.lastname
        FROM invoices
        INNER JOIN contacts
          ON invoices.contact_id = contacts.id
        ORDER BY invoices.date_due`);
      const list = query.all();
      return list;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOpenInvoices() {
    // Looking for a way to have conditional join cases?
    // SQL CASE probably is not doing the trick...
    try {
      const query = this.db.prepare(`SELECT invoices.id, invoices.status, invoices.amount, invoices.date_issue, invoices.date_paid, invoices.date_due,
          contacts.firstname, contacts.lastname
        FROM invoices
        INNER JOIN contacts
          ON invoices.contact_id = contacts.id
        WHERE invoices.status = 'open'
        ORDER BY invoices.date_due`);
      const list = query.all();
      return list;
    } catch (error) {
      console.log(error);
    }
  }

  async selectInvoiceById(id) {
    try {
      const query = this.db.prepare(`SELECT invoices.id, invoices.status, invoices.amount, invoices.date_issue, invoices.date_paid, invoices.date_due,
          invoices.description, contacts.id AS contact_id, contacts.firstname, contacts.lastname
        FROM invoices
        INNER JOIN contacts
          ON invoices.contact_id = contacts.id
        WHERE invoices.id = ?
        ORDER BY invoices.date_due`);
      const invoice = query.get(id);
      return invoice;
    } catch (error) {
      console.log(error);
    }
  }

  async selectInvoicesByContactId(id) {
    try {
      const query = this.db.prepare(`SELECT invoices.id, invoices.status, invoices.amount, invoices.date_issue, invoices.date_paid, invoices.date_due,
      contacts.firstname, contacts.lastname
        FROM invoices
        INNER JOIN contacts
          ON invoices.contact_id = contacts.id
        WHERE contacts.id = ?
        ORDER BY invoices.date_due`);
      const orderList = query.all(id);
      return orderList;
    } catch (error) {
      console.log(error);
    }
  }

  async updateInvoice(data) {
    const id = data.id;
    delete data.id;

    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);

    // cunstruct query string
    let queryString = 'UPDATE invoices SET ';
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

  async updateInvoicePaidStatus(id) {
    try {
      // update invoice status
      let query = this.db.prepare(`UPDATE invoices
        SET status = 'paid',  date_paid = date('now')
        WHERE id = ?`);
      let result = query.run(id);

      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteInvoice(id) {
    try {
      const query = this.db.prepare('DELETE FROM invoices WHERE id = ?');
      const result = query.run(id);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  // currently unused
  async deleteStandAloneInvoices() {
    try {
      const query = this.db.prepare(`DELETE FROM invoices
        WHERE NOT EXISTS (SELECT 1 FROM orders WHERE orders.invoice_id = invoices.id)
        AND NOT EXISTS (SELECT 1 FROM subscriptions WHERE subscriptions.invoice_id = invoices.id);`);

      const result = query.run();
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  // ==========
  // MORE GENERAL APPROACH
  async deleteEntryById(table, id) {
    try {
      const query = this.db.prepare(`DELETE FROM ${table} WHERE id = ${id}`);
      const result = query.run();
      return result;
    } catch (error) {
      console.log(error);
    }
  }
}
