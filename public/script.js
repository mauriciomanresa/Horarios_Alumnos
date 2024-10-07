document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("scheduleForm");
  const modal = document.getElementById("modal");
  const modalOverlay = document.getElementById("modalOverlay");
  const closeModal = document.getElementById("closeModal");
  const loadingIndicator = document.createElement("div");

  loadingIndicator.textContent = "Verificando disponibilidad...";
  loadingIndicator.style.color = "blue";
  loadingIndicator.style.display = "none";
  document.body.appendChild(loadingIndicator);

  // Deshabilito horarios reservados
  function disableBookedSlots() {
    const radios = form.querySelectorAll('input[name="dia_hora"]');
    loadingIndicator.style.display = "block";
    const requests = [];

    radios.forEach((radio) => {
      const value = radio.value;
      const request = fetch(`/check_availability?dia_hora=${value}`)
        .then((response) => response.json())
        .then((data) => {
          if (!data.available) {
            radio.disabled = true;
            if (!radio.parentElement.querySelector("span")) {
              radio.parentElement.innerHTML +=
                '<span style="color:red;">(No disponible)</span>';
            }
          }
        })
        .catch((error) => {
          console.error("Error al verificar disponibilidad:", error);
        });
      requests.push(request);
    });

    Promise.all(requests).finally(() => {
      loadingIndicator.style.display = "none";
    });
  }

  disableBookedSlots();

  // Muestro el modal al seleccionar horario
  const radios = form.querySelectorAll('input[name="dia_hora"]');
  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      // Limpio los campos
      document.getElementById("nombreAlumno").value = "";
      document.getElementById("nombrePadre").value = "";
      modal.style.display = "block";
      modalOverlay.style.display = "block";
    });
  });

  // Cierro el modal
  closeModal.addEventListener("click", () => {
    modal.style.display = "none";
    modalOverlay.style.display = "none";
  });

  // Envío del formulario
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const dia_hora = document.querySelector(
      'input[name="dia_hora"]:checked'
    ).value;
    const nombreAlumno = document.getElementById("nombreAlumno").value;
    const nombrePadre = document.getElementById("nombrePadre").value;

    const scheduleData = {
      dia_hora: dia_hora,
      nombreAlumno: nombreAlumno,
      nombrePadre: nombrePadre,
    };
    try {
      const response = await fetch("http://localhost:3000/submit_schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scheduleData),
      });
      if (!response.ok) {
        throw new Error("Error en la reserva");
      }
      const result = await response.text();
      alert("Horario reservado con éxito.");

      // Cierro el modal
      modal.style.display = "none";
      modalOverlay.style.display = "none";
      disableBookedSlots();
    } catch (error) {
      console.error("Error al reservar el horario:", error);
    }
  });
});

// Cargo horarios disponibles
async function loadAvailableSchedules() {
  const response = await fetch("/get_available_schedules");
  const availableSchedules = await response.json();
  const scheduleDropdown = document.getElementById("scheduleDropdown");

  if (scheduleDropdown) {
    // Limpio el dropdown
    scheduleDropdown.innerHTML = "";
    availableSchedules.forEach((schedule) => {
      const option = document.createElement("option");
      option.value = schedule.dia_hora;
      option.textContent = schedule.dia_hora;
      scheduleDropdown.appendChild(option);
    });
  } else {
    console.error("El elemento scheduleDropdown no se encontró.");
  }
}

// Cargo horarios disponibles
window.onload = loadAvailableSchedules;

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

setInterval(checkForUpdates, checkInterval);

const socket = io(); // Conecto al Socket.IO

socket.on("update", () => {
  location.reload();
});
