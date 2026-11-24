/** Executable backend script for the inspect schema workflow.
 * Runs its checks or maintenance steps and reports the resulting outcome. */
// One-off schema inspection (rule A): dumps SHOW CREATE TABLE for every table.
const getDbConnection = require("../database/db");

(
 /** Runs the script's main asynchronous workflow.
  * Accepts no arguments; returns a promise for the operation result. */
 async () => {
  const db = await getDbConnection();
  const [tables] = await db.query("SHOW TABLES");
  const names = tables.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts row; returns the transformed collection value. */
    (row) => Object.values(row)[0]);
  console.log("TABLES:", names.join(", "), "\n");

  for (const name of names) {
    const [create] = await db.query(`SHOW CREATE TABLE \`${name}\``);
    console.log(`==== ${name} ====`);
    console.log(create[0]["Create Table"]);
    console.log();
  }

  process.exit(0);
})().catch(
  /** Handles a rejected promise from the surrounding workflow.
   * Accepts err; returns the error-handling result. */
  (err) => {
    console.error(err);
    process.exit(1);
});
