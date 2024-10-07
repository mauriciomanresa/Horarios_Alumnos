async function loadSchedules() {
  const response = await fetch("/get_schedules");
  const schedules = await response.json();
  const tableBody = document
    .getElementById("scheduleTable")
    .querySelector("tbody");

  // Limpio la tabla
  tableBody.innerHTML = "";

  const dayOrder = {
    lunes: 1,
    martes: 2,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
  };

  // Ordeno por día y hora
  schedules.sort((a, b) => {
    const [dayA, timeA] = a.dia_hora.split("_");
    const [dayB, timeB] = b.dia_hora.split("_");

    // Comparo los días
    const dayComparison =
      dayOrder[dayA.toLowerCase()] - dayOrder[dayB.toLowerCase()];
    if (dayComparison !== 0) {
      return dayComparison;
    }

    // Comparo las horas
    return timeA.localeCompare(timeB);
  });

  // Renderizar tabla ordenada
  schedules.forEach((schedule) => {
    const row = document.createElement("tr");
    row.setAttribute("data-dia-hora", schedule.dia_hora);

    row.innerHTML = ` 
            <td>${schedule.dia_hora}</td>
            <td>${schedule.nombreAlumno}</td>
            <td>${schedule.nombrePadre}</td>
            <td>
                <button onclick="editSchedule('${schedule.dia_hora}')" class="botonEdit">Editar</button>
                <button onclick="deleteSchedule('${schedule.dia_hora}')" class="botonDelete">Eliminar</button>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

function editSchedule(dia_hora) {
  const newNameAlumno = prompt("Nuevo nombre del alumno:");
  const newNamePadre = prompt("Nuevo nombre del padre:");

  if (newNameAlumno && newNamePadre) {
    fetch("/submit_schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dia_hora,
        nombreAlumno: newNameAlumno,
        nombrePadre: newNamePadre,
      }),
    }).then((response) => {
      if (response.ok) {
        alert("Horario actualizado con éxito");
        // Actualizo fila sin moverla
        const rowToUpdate = document.querySelector(
          `tr[data-dia-hora="${dia_hora}"]`
        );
        if (rowToUpdate) {
          rowToUpdate.cells[1].textContent = newNameAlumno;
          rowToUpdate.cells[2].textContent = newNamePadre;
        }
      } else {
        alert("Error al actualizar el horario");
      }
    });
  }
}

async function deleteSchedule(dia_hora) {
  try {
    const response = await fetch(
      `/delete_schedule?dia_hora=${encodeURIComponent(dia_hora)}`,
      {
        method: "DELETE",
      }
    );

    if (response.ok) {
      alert("Horario eliminado con éxito");

      // Busco fila eliminada y elimino del DOM
      const rowToDelete = document.querySelector(
        `tr[data-dia-hora="${dia_hora}"]`
      );
      if (rowToDelete) {
        rowToDelete.remove();
      }
    } else {
      alert("Error al eliminar el horario");
    }
  } catch (error) {
    console.error("Error en la eliminación del horario:", error);
    alert("Error en la eliminación del horario");
  }
}

// Cargo horarios al inicio
window.onload = loadSchedules;

// Compruebo cambios
const checkInterval = 5000; // 5 segundos

let lastUpdateTime = Date.now();

async function checkForUpdates() {
  try {
    const response = await fetch("/last_update_time");
    if (response.ok) {
      const { lastUpdate } = await response.json();
      if (lastUpdate > lastUpdateTime) {
        lastUpdateTime = lastUpdate;
        location.reload();
      }
    }
  } catch (error) {
    console.error("Error al comprobar actualizaciones:", error);
  }
}

// Comprobar cambios en intervalos regulares
setInterval(checkForUpdates, checkInterval);

const socket = io(); // Conecto al Socket.IO

socket.on("update", () => {
  location.reload();
});

// Script salida
document.getElementById("btnSalir").addEventListener("click", () => {
  window.location.href = "salida.html"; });
