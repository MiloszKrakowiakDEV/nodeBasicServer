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
  let body = ""
  if (req.method === "POST") {
    switch (req.url) {

      case "/user/add":
        body = "";

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
      case "/user/getByLoginAndPassword":
        body = "";

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

            connection = await pool.getConnection();

            const [rows] = await connection.execute(
              `SELECT password FROM users WHERE username = ?`,
              [data.username]
            );

            if (rows.length === 0) {
              throw new Error("Nieprawidłowe dane logowania");;
            } else {
              const hashedPassword = rows[0].password;
              if (await bcrypt.compare(data.password, hashedPassword)) {
                const [rows] = await connection.execute(
                  `SELECT * FROM users WHERE username = ?`,
                  [data.username]
                );
                console.log(rows[0])
                res.writeHead(201, { 'Content-Type': 'application/json' });
                const user = rows[0];
                delete user.password;
                console.log(JSON.stringify(user))
                res.end(JSON.stringify(user));
              } else {
                throw new Error("Nieprawidłowe dane logowania");;
              }

            }


          } catch (err) {
            console.error(err)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } finally {
            if (connection) connection.release();
          }
        });

        break;
      case "/user/deleteUser":
        body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let connection;

          try {
            const data = JSON.parse(body);

            if (!data.username) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: "Użytkownik nie istnieje" }));
            }
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
              `SELECT id FROM users WHERE username = ?`,
              [data.username]
            );

            if (rows.length === 0) {
              throw new Error("Użytkownik nie istnieje");;
            } else {
              const selectedUser = rows[0];
              const val1 = await connection.execute(
                'DELETE FROM user_questions_answered WHERE user_id = ?',
                [selectedUser.id]
              )
              const val2 = await connection.execute(
                'DELETE FROM users WHERE id = ?',
                [selectedUser.id]
              )
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: "Konto zostało usunięte" }));

            }


          } catch (err) {
            console.error(err)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } finally {
            if (connection) connection.release();
          }
        });

        break;
      case "/user/getTopTenUsersByScore":
        body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let connection;

          try {
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
              `SELECT username, points, streak FROM users ORDER BY points DESC, username ASC LIMIT 10`
            );
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(rows));

          } catch (err) {
            console.error(err)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } finally {
            if (connection) connection.release();
          }
        });

        break;
      case "/user/getTopTenUsersByStreak":
        body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let connection;

          try {
            const data = JSON.parse(body);
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
              `SELECT username, points, streak FROM users ORDER BY streak DESC, username ASC LIMIT 10`
            );
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(rows));

          } catch (err) {
            console.error(err)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } finally {
            if (connection) connection.release();
          }
        });

        break;
      case "/user/getUserPositionByStreak":
        body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let connection;
          try {
            const data = JSON.parse(body);
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
              `SELECT streak FROM users WHERE username = ?`,
              [data.username]
            );
            if (rows.length === 0) {
              throw new Error("Nieprawidłowe dane logowania");;
            } else {
              const [val] = await connection.execute(
                `SELECT count(*)+1 as "message" FROM (
(SELECT * FROM users WHERE streak > ?  ORDER BY streak DESC, username ASC)
UNION ALL
(SELECT * FROM users WHERE streak = ? AND username < ? ORDER BY streak DESC, username ASC)
) AS "Merged table"`,
                [rows[0].streak, rows[0].streak, data.username]
              );
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(val[0]));
            }
          } catch (err) {
            console.error(err)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } finally {
            if (connection) connection.release();
          }
        });
        break;
      case "/user/getUserPositionByScore":
        body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let connection;
          try {
            const data = JSON.parse(body);
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
              `SELECT points FROM users WHERE username = ?`,
              [data.username]
            );
            if (rows.length === 0) {
              throw new Error("Nieprawidłowe dane logowania");;
            } else {
              const [val] = await connection.execute(
                `SELECT count(*)+1 as "message" FROM (
(SELECT * FROM users WHERE points > ?  ORDER BY points DESC, username ASC)
UNION ALL
(SELECT * FROM users WHERE points = ? AND username < ? ORDER BY points DESC, username ASC)
) AS "Merged table"`,
                [rows[0].points, rows[0].points, data.username]
              );
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(val[0]));
            }
          } catch (err) {
            console.error(err)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } finally {
            if (connection) connection.release();
          }
        });
        break;
      case "/user/changePassword":
        body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let connection;
          try {
            const data = JSON.parse(body);

            if (!data.username || !data.oldPassword || !data.newPassword) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              throw new Error("Brak nazwy użytkownika, hasła lub nowego hasła");
            }
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
              `SELECT password, id FROM users WHERE username = ?`,
              [data.username]
            );

            if (rows.length === 0) {
              throw new Error("Nieprawidłowe dane logowania");;
            } else {
              const hashedPassword = rows[0].password;
              if (await bcrypt.compare(data.oldPassword, hashedPassword)) {
                const new_password = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
                const [] = await connection.execute(
                  'UPDATE users SET password = ? WHERE id = ?',
                  [new_password, rows[0].id]
                )
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Poprawnie zmieniono hasło" }));
              } else {
                throw new Error("Nieprawidłowe dane logowania");;
              }

            }

          } catch (err) {
            console.error(err)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } finally {
            if (connection) connection.release();
          }
        });

        break;
      case "/category/getTheory":
        body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let connection;

          try {
            const data = JSON.parse(body);
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
              `SELECT formula_info AS "formulaInfo", naming_info AS "namingInfo", chemical_properties AS "chemicalProperties", physical_properties AS "physicalProperties" FROM categories WHERE name = ?`,
              [data.message]
            );
            if (rows.length === 0) {
              throw new Error("Nie znaleziono kategori")
            } else {
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(rows[0]));
            }

          } catch (err) {
            console.error(err)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } finally {
            if (connection) connection.release();
          }
        });

        break;
      case "/user/getUnansweredQuestionsByCategoryAndType":
        body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let connection;

          try {
            const data = JSON.parse(body);
            connection = await pool.getConnection();
            const [rows1] = (await connection.execute(
              'select id from users where username = ?',
              [data.username])
            )
            const [rows2] = (await connection.execute(
              'select id from categories where name = ?',
              [data.category])
            )
            const [rows] = await connection.execute(
              `select q.id, q.category_id as categoryId, q.type, q.content, q.answers, q.points_award as pointsAward from (select id from (select q.id from questions as q
union all
select  q.id
from questions q left join user_questions_answered uqa on uqa.question_id  = q.id
inner join users u on u.id = uqa.user_id  where  type = ? and uqa.user_id = ?)
as mt group by mt.id having count(mt.id) = 1
) as qid inner join questions q on q.id = qid.id where q.category_id = ?`,
              [data.type, rows1[0].id, rows2[0].id]
            );
            if (rows.length === 0) {
              throw new Error("Użytkownik odpowiedział na wszystkie pytania")
            } else {
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(rows));
            }

          } catch (err) {
            console.error(err)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } finally {
            if (connection) connection.release();
          }
        });

        break;
      case "/user/setQuestionAsAnswered":
        body = "";

        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let connection;

          try {
            const data = JSON.parse(body);
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
              'select id from users where username = ?',
              [data.username])
            const [rows1] = await connection.execute(
              'select points_award from questions where id = ?',
              [data.questionId])

            const [] = await connection.execute(
              'insert into user_questions_answered(user_id, question_id) values(?,?)',
              [rows[0].id, data.questionId])
              
            const [] = await connection.execute(
              'update users set points = points + ? where id = ?',
              [rows1[0].points_award,rows[0].id])


            if (rows.length === 0) {
              throw new Error("Użytkownik nie istnieje")
            } else {
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: "Poprawnie odpowiedziano" }));
            }

          } catch (err) {
            console.error(err)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } finally {
            if (connection) connection.release();
          }
        });

        break;
    }
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Nie znaleziono endpointu" }));
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});