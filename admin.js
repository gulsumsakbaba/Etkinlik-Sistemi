const API_URL = 'http://localhost:3002/api';
const token = localStorage.getItem('token');

if (!token) {
  alert("Lütfen önce giriş yapın.");
  window.location.href = "index.html";
}

const payload = JSON.parse(atob(token.split('.')[1]));
if (payload.role !== "admin") {
  alert("Bu sayfaya yalnızca yöneticiler erişebilir.");
  window.location.href = "index.html";
}

async function getPendingUsers() {
  const res = await fetch(`${API_URL}/admin/pending-users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const users = await res.json();

  const container = document.getElementById('pendingUsers');
  if (users.length === 0) {
    container.innerHTML = "<p>Onay bekleyen kullanıcı yok.</p>";
    return;
  }

  users.forEach(user => {
    const div = document.createElement('div');
    div.innerHTML = `
      <p>${user.email}</p>
      <button onclick="approveUser(${user.id})">Onayla</button>
    `;
    container.appendChild(div);
  });
}

async function approveUser(userId) {
  const res = await fetch(`${API_URL}/admin/approve-user/${userId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.ok) {
    alert("Kullanıcı onaylandı.");
    location.reload();
  } else {
    alert("Hata oluştu.");
  }
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}


// Yeni etkinlik ekleme
document.getElementById('eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const event = {
    name: document.getElementById('eventName').value,
    description: document.getElementById('eventDesc').value,
    date: document.getElementById('eventDate').value,
    type: document.getElementById('eventType').value,
    city: document.getElementById('eventCity').value,
    price: parseFloat(document.getElementById('eventPrice').value),
    availableSeats: parseInt(document.getElementById('eventSeats').value),
    image: document.getElementById('eventImage').value
  };

  try {
    const res = await fetch(`${API_URL}/admin/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
    if (!res.ok) throw new Error("Eklenemedi");
    alert("Etkinlik eklendi.");
    loadEventsForAdmin();
  } catch (err) {
    alert("Hata: " + err.message);
  }
});

// Etkinlikleri yükle
async function loadEventsForAdmin() {
  const res = await fetch(`${API_URL}/admin/events`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const events = await res.json();

  const list = document.getElementById('eventList');
  list.innerHTML = '';
  events.forEach(ev => {
    const div = document.createElement('div');
    div.className = "event-card";
    div.innerHTML = `
      <h4>${ev.name} (${ev.city})</h4>
      <p>${ev.date} | ${ev.type}</p>
      <p>${ev.description}</p>
      <p>Fiyat: ${ev.price}₺ | Koltuk: ${ev.availableSeats}</p>
      <p>Yayın Durumu: <strong>${ev.isPublished ? "✔ Yayında" : "❌ Yayında değil"}</strong></p>
      <button onclick="togglePublish(${ev.id})">${ev.isPublished ? "Yayından Kaldır" : "Yayına Al"}</button>
      <button onclick="deleteEvent(${ev.id})">Sil</button>
    `;
    list.appendChild(div);
  });
}

async function togglePublish(id) {
  const res = await fetch(`${API_URL}/admin/events/${id}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    alert("Durum değiştirildi");
    loadEventsForAdmin();
  } else {
    alert("Hata oluştu.");
  }
}

async function deleteEvent(id) {
  const confirmed = confirm("Silmek istediğinize emin misiniz?");
  if (!confirmed) return;

  const res = await fetch(`${API_URL}/admin/events/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    alert("Silindi");
    loadEventsForAdmin();
  } else {
    alert("Silinemedi");
  }
}
// Yeni duyuru ekleme
document.getElementById('announcementForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('announcementTitle').value;
  const content = document.getElementById('announcementContent').value;

  try {
    const res = await fetch(`${API_URL}/admin/announcements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, content })
    });

    if (!res.ok) throw new Error("Eklenemedi");
    alert("Duyuru eklendi");
    loadAnnouncementsForAdmin();
  } catch (err) {
    alert("Hata: " + err.message);
  }
});

// Duyuruları listele
async function loadAnnouncementsForAdmin() {
  const res = await fetch(`${API_URL}/admin/announcements`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const list = document.getElementById('announcementList');
  const announcements = await res.json();

  list.innerHTML = '';
  announcements.forEach((a, i) => {
    const div = document.createElement('div');
    div.className = "announcement-card";
    div.innerHTML = `
      <h4>${a.title}</h4>
      <p>${a.content}</p>
      <button onclick="deleteAnnouncement(${i})">Sil</button>
    `;
    list.appendChild(div);
  });
}

async function deleteAnnouncement(index) {
  const confirmed = confirm("Duyuruyu silmek istiyor musunuz?");
  if (!confirmed) return;

  const res = await fetch(`${API_URL}/admin/announcements/${index}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    alert("Silindi");
    loadAnnouncementsForAdmin();
  } else {
    alert("Silinemedi");
  }
}


getPendingUsers();
loadEventsForAdmin();
loadAnnouncementsForAdmin();



