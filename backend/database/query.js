const getDbConnection = require("./db");

/**
 * Execute a single query
 * @param {*} sql
 * @returns query result
 */
async function doQuery(sql, params = []) {
  const db = await getDbConnection();
  const result = await db.query(sql, params);

  // console.log(result[0], '😆 in doQuery');
  return result[0];
}

module.exports = doQuery;
