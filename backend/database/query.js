/** Provides the backend's shared single-query database helper.
 * Executes parameterized SQL through the configured MySQL pool. */
const getDbConnection = require("./db");

/**
 * Execute a single query
 * @param {*} sql
 * @returns query result
 */
/** Executes parameterized SQL through the shared connection pool.
 * Accepts sql and params; returns a promise for the database rows or write result. */
async function doQuery(sql, params = []) {
  const db = await getDbConnection();
  const result = await db.query(sql, params);

  // console.log(result[0], '😆 in doQuery');
  return result[0];
}

module.exports = doQuery;
