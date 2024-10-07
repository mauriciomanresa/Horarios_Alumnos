const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Inicializo Socket.IO
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json()); // Para procesar JSON
app.use(bodyParser.urlencoded({ extended: true })); // Para procesar datos de formularios
app.use(express.static("public")); // Para servir archivos estáticos como HTML

// Conecto a la base de datos SQLite
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err.message);
  } else {
    console.log("Conectado a la base de datos SQLite.");
    // Prueba de escritura
    db.run(
      "CREATE TABLE IF NOT EXISTS test_write (id INTEGER PRIMARY KEY)",
      (err) => {
        if (err) {
          console.error("Error al crear la tabla de prueba:", err.message);
        } else {
          console.log("La base de datos es accesible para escritura.");
        }
      }
    );
  }
});

// Creo la tabla de horarios
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS horarios (dia_hora TEXT PRIMARY KEY, nombreAlumno TEXT, nombrePadre TEXT, disponible INTEGER DEFAULT 1)"
  );
});

// Verifico la disponibilidad de un horario
app.get("/check_availability", (req, res) => {
  const { dia_hora } = req.query;
  db.get(
    "SELECT disponible FROM horarios WHERE dia_hora = ?",
    [dia_hora],
    (err, row) => {
      if (err) {
        console.error("Error al verificar disponibilidad:", err.message);
        return res.status(500).send("Error al verificar disponibilidad");
      }
      if (row && row.disponible === 0) {
        return res.json({ available: false });
      }
      return res.json({ available: true });
    }
  );
});

// Proceso el formulario
app.post("/submit_schedule", (req, res) => {
  console.log("Datos recibidos en la solicitud POST:", req.body);
  const { dia_hora, nombreAlumno, nombrePadre } = req.body;
  if (!dia_hora || !nombreAlumno || !nombrePadre) {
    return res
      .status(400)
      .send("Por favor, completa todos los campos obligatorios.");
  }
  // Inserto o actualizo el horario
  db.run(
    "INSERT OR REPLACE INTO horarios (dia_hora, nombreAlumno, nombrePadre, disponible) VALUES (?, ?, ?, 0)",
    [dia_hora, nombreAlumno, nombrePadre],
    function (err) {
      if (err) {
        console.error("Error al reservar el horario:", err.message);
        return res
          .status(500)
          .send("Error al reservar el horario en la base de datos");
      }
      console.log("Horario reservado con éxito.");
      io.emit("update"); // Emito evento de actualización
      res.send("Horario reservado con éxito");
    }
  );
});

// Obtengo los horarios reservados
app.get("/get_schedules", (req, res) => {
  db.all("SELECT * FROM horarios WHERE disponible = 0", [], (err, rows) => {
    if (err) {
      console.error("Error al obtener horarios:", err.message);
      return res.status(500).send("Error al obtener horarios");
    }
    res.json(rows);
  });
});

// Obtengo los horarios disponibles
app.get("/get_available_schedules", (req, res) => {
  db.all(
    "SELECT dia_hora FROM horarios WHERE disponible = 1",
    [],
    (err, rows) => {
      if (err) {
        console.error("Error al obtener horarios disponibles:", err.message);
        return res.status(500).send("Error al obtener horarios disponibles");
      }
      res.json(rows);
    }
  );
});

// Elimino un horario
app.delete("/delete_schedule", (req, res) => {
  const dia_hora = decodeURIComponent(req.query.dia_hora); // usando query parameters
  db.run("DELETE FROM horarios WHERE dia_hora = ?", [dia_hora], function (err) {
    if (err) {
      console.error("Error al eliminar el horario:", err.message);
      return res.status(500).send("Error al eliminar el horario");
    }
    // Vulevo a marcar el horario como disponible
    db.run(
      "INSERT OR REPLACE INTO horarios (dia_hora, disponible) VALUES (?, 1)",
      [dia_hora],
      function (err) {
        if (err) {
          console.error("Error al actualizar disponibilidad:", err.message);
          return res.status(500).send("Error al actualizar disponibilidad");
        }
        io.emit("update"); // Emito evento de actualización
      }
    );
    res.send("Horario eliminado con éxito");
  });
});

// Accedo a la página de administración
app.get("/admin", (req, res) => {
  const password = req.query.password;
  if (password === "key123") {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
  } else {
    res.status(403).send("Acceso denegado");
  }
});

// Servir la página de inicio al acceder a la raíz "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "inicio.html"));
});

// Ruta para cargar index.html cuando se elija "Virtual"
app.get("/virtual", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "virtual.html"));
});


// Inicio el servidor
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

// Cierro la base de datos al detener el servidor
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error al cerrar la base de datos:", err.message);
    }
    console.log("Base de datos cerrada.");
    process.exit(0);
  });
});


