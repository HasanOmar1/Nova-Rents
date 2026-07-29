const mysql = require("mysql2/promise");

const isProduction = process.env.NODE_ENV === "production";

const dbConfig = {
  host: isProduction ? process.env.DB_HOST : "localhost",
  user: isProduction ? process.env.DB_USER : "root",
  password: isProduction ? process.env.DB_PASSWORD : "",
  database: isProduction ? process.env.DB_NAME : "Nova_rents",
  port: isProduction ? Number(process.env.DB_PORT) : 3306,
};

if (isProduction) {
  dbConfig.ssl = {
    rejectUnauthorized: true,
  };
}

let pool;

function getDbConnection() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }

  return pool;
}

module.exports = getDbConnection;
