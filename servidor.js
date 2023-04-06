const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;


app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'libni',
  password: '271000',
  database: 'anuario'
});

app.get('/', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const connection = await pool.getConnection();
    const [results, fields] = await connection.query(
      'SELECT * FROM (SELECT "alumnos" as tipo, id_alumno as id, correo, password FROM alumnos UNION SELECT "docentes" as tipo, id_docente as id, correo, password FROM docentes) as t WHERE correo = ? LIMIT 1',
      [email]
    );
    if (results.length === 0) {
      res.render('login', { error: 'Correo o contraseña incorrectos' });
    } else {
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.session.user = user;
        res.redirect('/home');
      } else {
        res.render('login', { error: 'Correo o contraseña incorrectos' });
      }
    }
    connection.release();
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Ocurrió un error al intentar iniciar sesión' });
  }
});

app.get('/logout', (req, res) => {
  delete req.session.user;
  res.redirect('/');
});

app.get('/home', (req, res) => {
  const user = req.session.user;
  if (!user) {
    res.redirect('/');
  } else {
    res.render('home', { user });
  }
});

app.post('/register', async (req, res) => {
  const { email, password, tipo } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const connection = await pool.getConnection();
    if (tipo === 'alumno') {
      await connection.query(
        'INSERT INTO alumnos (correo, password) VALUES (?, ?)',
        [email, hash]
      );
    } else if (tipo === 'docente') {
      await connection.query(
        'INSERT INTO docentes (correo, password) VALUES (?, ?)',
        [email, hash]
      );
    }
    connection.release();
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Ocurrió un error al intentar registrarse' });
  }
});
app.use(express.static(__dirname + '/public'));
app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
