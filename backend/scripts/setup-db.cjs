// Applies schema.sql to create the database tables on first launch.
// Usage: node setup.cjs <dbPath> <schemaPath>
const fs = require("node:fs");
const Database = require("better-sqlite3");

const db = new Database(process.argv[2]);
db.exec(fs.readFileSync(process.argv[3], "utf8"));
db.close();
console.log("Database schema created");
