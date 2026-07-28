// One-off schema inspection (rule A): dumps SHOW CREATE TABLE for every table.
const getDbConnection = require("../database/db");

(async () => {
  const db = await getDbConnection();
  const [tables] = await db.query("SHOW TABLES");
  const names = tables.map((row) => Object.values(row)[0]);
  console.log("TABLES:", names.join(", "), "\n");

  for (const name of names) {
    const [create] = await db.query(`SHOW CREATE TABLE \`${name}\``);
    console.log(`==== ${name} ====`);
    console.log(create[0]["Create Table"]);
    console.log();
  }

  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
