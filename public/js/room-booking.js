const form = document.getElementById('booking-form');
const message = document.getElementById('booking-message');
document.getElementById('date').value = new Date().toISOString().slice(0, 10);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';
  const date = document.getElementById('date').value;
  const startIso = new Date(`${date}T${document.getElementById('startTime').value}`).toISOString();
  const endIso = new Date(`${date}T${document.getElementById('endTime').value}`).toISOString();

  try {
    await apiFetch('/api/room-booking', {
      method: 'POST',
      body: JSON.stringify({
        startIso,
        endIso,
        purpose: document.getElementById('purpose').value,
        visitorName: document.getElementById('visitorName').value,
      }),
    });
    message.style.color = 'var(--green)';
    message.textContent = 'Réservation confirmée.';
    form.reset();
    document.getElementById('date').value = new Date().toISOString().slice(0, 10);
  } catch (err) {
    message.style.color = 'var(--red)';
    message.textContent = err.message;
  }
});

ensureSession();
