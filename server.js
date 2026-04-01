require('dotenv').config();
const http = require('http');
const mysql = require('mysql2/promise');

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
  console.log("Got a request")
  if (req.method == "POST") {
    switch (req.url) {
      case "/user/add":
        let body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            console.log(body)
            const data = JSON.parse(body);
            const connection = await pool.getConnection();
           await connection.execute(
              `INSERT INTO users(username, password,points) VALUES (?, ?, ?)`,
              [data.username, data.password,data.points]
            );
            connection.release();
            res.end("Added user: " + data.username + " " + data.password + " "+ data.points);
          }
          catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }

        });

    }
  } else {
    switch (req.url) {

      
    }

  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });