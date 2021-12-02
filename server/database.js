const mysql = require("mysql");
const dotenv = require("dotenv").config();
let instance = null;

const connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

connection.connect((err) => {
  if (!err) console.log(`Database: ${connection.state}`);
  else console.log(`Database: ${err.message}`);
});

class DbService {
  static getDatabaseInstance() {
    return instance ? instance : new DbService();
  }

  async insertNewContact(data) {
    try {
      // delete empty entries
      Object.keys(data).forEach((key) => !data[key] && data[key] !== undefined && delete data[key]);
      data.date_added = new Date();
      const dataKeys = Object.keys(data);
      const dataValues = Object.values(data);
      let parameterCount = "";
      for (let i = 0; i < dataKeys.length; i++) {
        if (i === 0) parameterCount += "?";
        else parameterCount += ",?";
      }

      data.id = await new Promise((resolve, reject) => {
        const query = `INSERT INTO contacts (${dataKeys}) VALUES (${parameterCount});`;
        connection.query(query, dataValues, (err, result) => {
          if (err) reject(new Error(err.message));
          resolve(result.insertId);
        });
      });

      return data.id;
    } catch (error) {
      console.log(error);
    }
  }

  async getContactById(id) {
    try {
      const response = await new Promise((resolve, reject) => {
        const query = "SELECT * FROM contacts WHERE id = ?;";
        connection.query(query, [id], (err, results) => {
          if (err) reject(new Error(err.message));
          resolve(results);
        });
      });

      return response;
    } catch (error) {
      console.log(error);
    }
  }

  async getAllContacts() {
    try {
      const response = await new Promise((resolve, reject) => {
        const query = "SELECT * FROM contacts ORDER BY lastname;";
        connection.query(query, (err, results) => {
          if (err) reject(new Error(err.message));
          resolve(results);
        });
      });

      return response;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteContactById(id) {
    try {
      id = parseInt(id, 10);
      const response = await new Promise((resolve, reject) => {
        const query = "DELETE FROM contacts WHERE id = ?;";

        connection.query(query, [id], (err, result) => {
          if (err) reject(new Error(err.message));
          resolve(result.affectedRows);
        });
      });
      return response === 1 ? true : false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async updateContactById(id, data) {
    try {
      id = parseInt(id, 10);
      const { firstname, lastname, company, address, email, phone, notes } = data;
      const response = await new Promise((resolve, reject) => {
        const query = "UPDATE contacts SET firstname = ?, lastname = ?, company = ?, address = ?, email = ?, phone = ?, notes = ? WHERE id = ?;";

        connection.query(query, [firstname, lastname, company, address, email, phone, notes, id], (err, result) => {
          if (err) reject(new Error(err.message));
          resolve(result.affectedRows);
        });
      });
      return response === 1 ? { success: true, id: id } : { success: false, id: id };
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async searchContacts(string) {
    try {
      const response = await new Promise((resolve, reject) => {
        const query = `SELECT * FROM contacts WHERE firstname LIKE '%${string}%' OR lastname LIKE '%${string}%';`;
        connection.query(query, [string], (err, results) => {
          if (err) reject(new Error(err.message));
          resolve(results);
        });
      });

      return response;
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = DbService;
