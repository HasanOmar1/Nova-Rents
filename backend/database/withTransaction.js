/** Provides shared MySQL transaction and connection query helpers.
 * Commits successful work, rolls back failures, and releases connections. */
const getDbConnection = require("./db");

/**
 * Run work on a single pooled connection inside BEGIN…COMMIT.
 * On error: ROLLBACK then rethrow. Always releases the connection.
 *
 * @param {(connection: import('mysql2/promise').PoolConnection) => Promise<any>} work
 */
/** Runs asynchronous database work inside a commit-or-rollback transaction.
 * Accepts work; returns a promise for the committed callback result. */
async function withTransaction(work) {
  const pool = getDbConnection();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Transaction rollback failed:", rollbackError.message);
    }
    throw error;
  } finally {
    try {
      connection.release();
    } catch (releaseError) {
      // A pool bookkeeping failure must not turn an acknowledged COMMIT into
      // an apparent mutation failure or replace the original transaction error.
      console.error(
        "Transaction connection release failed:",
        releaseError.message,
      );
    }
  }
}

/** Query helper bound to one transaction connection (same shape as doQuery). */
/** Executes parameterized SQL on an existing database connection.
 * Accepts connection, sql, and params; returns a promise for the database rows or write result. */
async function queryOnConnection(connection, sql, params = []) {
  const [rows] = await connection.query(sql, params);
  return rows;
}

module.exports = {
  withTransaction,
  queryOnConnection,
};
