// Simple MySQL connection helper: creates and reuses a single connection
const mysql = require("mysql2/promise");

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "Nova_rents",
};

let connection;

async function getDbConnection() {
  if (!connection) {
    connection = await mysql.createConnection(dbConfig);
  }

  return connection;
}

module.exports = getDbConnection;
