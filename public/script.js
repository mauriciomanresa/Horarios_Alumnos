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
  async function disableBookedSlots() {
    const radios = form.querySelectorAll('input[name="dia_hora"]');
    loadingIndicator.style.display = "block";

    const requests = [];

    for (const radio of radios) {
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
    }

    await Promise.all(requests);
    loadingIndicator.style.display = "none";
  }

  disableBookedSlots();

  // Mostrar modal al seleccionar horario
  const radios = form.querySelectorAll('input[name="dia_hora"]');
  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      document.getElementById("nombreAlumno").value = "";
      document.getElementById("nombrePadre").value = "";
      modal.style.display = "block";
      modalOverlay.style.display = "block";
    });
  });

  // Cerrar modal
  closeModal.addEventListener("click", () => {
    modal.style.display = "none";
    modalOverlay.style.display = "none";
  });

  // Enviar formulario
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
      const response = await fetch("/submit_schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        throw new Error("Error en la reserva");
      }

      alert("Horario reservado con éxito.");
      modal.style.display = "none";
      modalOverlay.style.display = "none";
      disableBookedSlots();
    } catch (error) {
      console.error("Error al reservar el horario:", error);
    }
  });

  // Detección de cambios usando Socket.IO
  const socket = io();
  socket.on("update", () => {
    location.reload(); // Actualizo cuando hay cambios
  });

  // Función para verificar actualizaciones periódicamente
  async function checkForUpdates() {
    try {
      const response = await fetch("/last_update_time");
      if (response.ok) {
        const { lastUpdate } = await response.json();
        if (lastUpdate > lastUpdateTime) {
          location.reload(); // Recargo la página si hay actualizaciones
        }
      }
    } catch (error) {
      console.error("Error al comprobar actualizaciones:", error);
    }
  }

  // Verificar actualizaciones
  const checkInterval = 5000; //5 segundos
  let lastUpdateTime = Date.now();
  setInterval(checkForUpdates, checkInterval);
});

// Script salida
document.getElementById("btnSalir").addEventListener("click", () => {
  window.location.href = "salida.html";
});
