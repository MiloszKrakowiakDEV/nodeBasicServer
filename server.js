require('dotenv').config();
const http = require('http');
const mysql = require('mysql2/promise');
const http = require("http");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


const server = http.createServer(async (req, res) => {
  console.log("Got a request");

  if (req.method == "POST") {
    switch (req.url) {

      case "/user/add":
        let body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            console.log(body);
            const data = JSON.parse(body);

            const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

            const connection = await pool.getConnection();

            await connection.execute(
              `INSERT INTO users(username, password, points) VALUES (?, ?, ?)`,
              [data.username, hashedPassword, data.points]
            );

            connection.release();

            res.end("Added user: " + data.username);

          } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });

        break;
    }
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });