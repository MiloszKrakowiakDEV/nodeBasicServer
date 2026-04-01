require('dotenv').config();
const http = require('http');
const mysql = require('mysql2/promise');
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

  if (req.method === "POST") {
    switch (req.url) {

      case "/user/add":
        let body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let connection;

          try {
            const data = JSON.parse(body);

            if (!data.username || !data.password) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: "Brak nazwy użytkownika lub hasła" }));
            }

            const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

            connection = await pool.getConnection();

            await connection.execute(
              `INSERT INTO users(username, password, points) VALUES (?, ?, ?)`,
              [data.username, hashedPassword, data.points || 0]
            );

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Użytkownik utworzony" }));

          } catch (err) {
            console.error(err);

            if (err.code === "ER_DUP_ENTRY") {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: "Użytkownik już istnieje" }));
            }

            if (err.code === "ER_BAD_NULL_ERROR") {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: "Brak wymaganych danych" }));
            }

            if (err instanceof SyntaxError) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: "Niepoprawny JSON" }));
            }

            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Błąd serwera" }));
          } finally {
            if (connection) connection.release();
          }
        });

        break;
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Nie znaleziono endpointu" }));
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });