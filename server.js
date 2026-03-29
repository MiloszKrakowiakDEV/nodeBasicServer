require('dotenv').config();
const http = require('http');
const mysql = require('mysql2/promise');

// Create a connection pool
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

// Initialize the users table if it doesn't exist
async function initDB() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(45) NOT NULL,
      last_name VARCHAR(45) NOT NULL,
      age INT NOT NULL
    )
  `;
  const connection = await pool.getConnection();
  await connection.query(createTableQuery);
  connection.release();
  console.log('Users table ready');
}

// Start the server
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/user') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { id } = JSON.parse(body);

        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing user id' }));
          return;
        }

        const connection = await pool.getConnection();
        const [rows] = await connection.query(
          'SELECT name, last_name FROM users WHERE id = ?',
          [id]
        );
        connection.release();

        if (rows.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'User not found' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(rows[0]));
        }
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
});

const PORT = process.env.PORT || 3000;

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize DB', err);
});