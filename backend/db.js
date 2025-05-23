const { Pool } = require("pg");

const pool = new Pool({
  user: "Anupam Maurya",     // Change this
  host: "localhost",
  database: "Gamehosting", // Change this
  password: "#Anupam1234", // Change this
  port: 5432,                // Default PostgreSQL port
});

module.exports = pool;
