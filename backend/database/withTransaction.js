const getDbConnection = require("./db");

/**
 * Run work on a single pooled connection inside BEGIN…COMMIT.
 * On error: ROLLBACK then rethrow. Always releases the connection.
 *
 * @param {(connection: import('mysql2/promise').PoolConnection) => Promise<any>} work
 */
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
async function queryOnConnection(connection, sql, params = []) {
  const [rows] = await connection.query(sql, params);
  return rows;
}

module.exports = {
  withTransaction,
  queryOnConnection,
};
