const API_URL = 'http://localhost:3002/api';
console.log("main.js yüklendi");

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload && payload.role) {
                if (payload.role === "admin") {
                    window.location.href = "admin.html";
                } else {
                    showMainContent(payload);
                }
                return;
            }
        } catch (e) {
            localStorage.removeItem('token');
        }
    }
console.log("loadevent üstü")
   const loginSection = document.getElementById('loginSection');
   console.log("loadevent üstü")
const registerSection = document.getElementById('registerSection');
const mainContent = document.getElementById('mainContent');
const adminPanel = document.getElementById('adminPanel');

// Sadece varsa eriş
if (mainContent && mainContent.style) mainContent.style.display = 'none';
if (adminPanel && adminPanel.style) adminPanel.style.display = 'none';
if (loginSection && loginSection.style) loginSection.style.display = 'block';
if (registerSection && registerSection.style) registerSection.style.display = 'none';

});

const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');

if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
}

if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const interest = document.getElementById('registerInterest').value;

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, interest })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Kayıt başarısız');
        alert('Kayıt başarılı! Yönetici onayı bekleniyor.');
    } catch (err) {
        alert('Bir hata oluştu! ' + err.message);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        localStorage.setItem('token', data.token);
        const payload = JSON.parse(atob(data.token.split('.')[1]));

        if (data.isFirstLogin) {
            window.location.href = '/change_password.html';
            return;
        }

        if (payload.role === "admin") {
            window.location.href = "admin.html";
        } else {
            showMainContent(payload);
        }

    } catch (err) {
        alert('Bir hata oluştu! ' + err.message);
    }
}

function showMainContent(user) {
    if (document.getElementById('loginSection')) document.getElementById('loginSection').style.display = 'none';
    if (document.getElementById('registerSection')) document.getElementById('registerSection').style.display = 'none';
    if (document.getElementById('mainContent')) document.getElementById('mainContent').style.display = 'block';
    if (document.getElementById('passwordChangeSection')) document.getElementById('passwordChangeSection').style.display = 'none';
    if (document.getElementById('contentAfterPasswordChange')) document.getElementById('contentAfterPasswordChange').style.display = 'block';

    loadEvents();
    loadAnnouncements();
    renderCart();

    if (user.role === 'admin') {
        if (document.getElementById('adminPanel')) document.getElementById('adminPanel').style.display = 'block';
        loadPendingUsers();
    } else {
        if (document.getElementById('adminPanel')) document.getElementById('adminPanel').style.display = 'none';
    }

    if (user.interest) {
        loadSuggestedEvents(user.interest);
    }
}

async function loadEvents() {
    try {
        const res = await fetch(`${API_URL}/events`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const events = await res.json();
        const list = document.getElementById('eventsList');
        list.innerHTML = '';

        // Etkinlikleri tarihe göre sırala
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        const defaultImages = {
            'Müzik': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
            'Outdoor': 'https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=800',
            'Konferans': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
            'Tiyatro': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800'
        };

        for (const ev of events) {
            const div = document.createElement('div');
            div.className = 'event-card';
            const imageUrl = ev.image || defaultImages[ev.type] || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800';
            div.innerHTML = `
                <img src="${imageUrl}" alt="${ev.name}"/>
                <div class="card-body">
                    <h3>${ev.name}</h3>
                    <p><strong>Tarih:</strong> ${new Date(ev.date).toLocaleDateString('tr-TR')}</p>
                    <p><strong>Şehir:</strong> ${ev.city}</p>
                    <p><strong>Tür:</strong> ${ev.type}</p>
                    <p><strong>Açıklama:</strong> ${ev.description}</p>
                    <p><strong>Kalan Kontenjan:</strong> ${ev.availableSeats}</p>
                    
                    <div class="ticket-options">
                        <h4>Bilet Seçenekleri</h4>
                        <select id="ticketType-${ev.id}" onchange="updatePrice(${ev.id}, ${ev.price})">
                            <option value="standard">Standart (${ev.price}₺)</option>
                            <option value="student">Öğrenci (${ev.price * 0.5}₺)</option>
                            <option value="vip">VIP (${ev.price * 1.5}₺)</option>
                        </select>
                        <button onclick="addToCart(${ev.id})">Bileti Sepete Ekle</button>
                    </div>

                    <div class="weather-info" id="weather-${ev.id}">
                        <h4>Hava Durumu</h4>
                        <p>⏳ Hava durumu yükleniyor...</p>
                    </div>
                </div>
            `;
            list.appendChild(div);

            // Hava durumu bilgisini al
            try {
                const cityParam = ev.city
                    .normalize('NFD')
                    .replace(/[̀-ͯ]/g, '')
                    .replace(/ı/g, 'i')
                    .replace(/ş/g, 's')
                    .replace(/ç/g, 'c')
                    .replace(/ğ/g, 'g')
                    .replace(/ü/g, 'u')
                    .replace(/ö/g, 'o');

                const wRes = await fetch(`${API_URL}/weather/${cityParam}`);
                const w = await wRes.json();
                
                const weatherDiv = document.getElementById(`weather-${ev.id}`);
                weatherDiv.innerHTML = `
                    <h4>Hava Durumu</h4>
                    <p>🌡 Sıcaklık: ${w.temp}°C</p>
                    <p>🌤 Durum: ${w.condition}</p>
                    <p>${w.message}</p>
                `;
            } catch (err) {
                document.getElementById(`weather-${ev.id}`).innerHTML = `
                    <h4>Hava Durumu</h4>
                    <p>❌ Hava durumu bilgisi alınamadı</p>
                `;
            }
        }
    } catch (err) {
        console.error('Etkinlikler yüklenemedi:', err);
        document.getElementById('eventsList').innerHTML = '<p>Etkinlikler yüklenirken bir hata oluştu.</p>';
    }
}

function updatePrice(eventId, basePrice) {
    const ticketType = document.getElementById(`ticketType-${eventId}`).value;
    let finalPrice = basePrice;
    
    switch(ticketType) {
        case 'student':
            finalPrice *= 0.5;
            break;
        case 'vip':
            finalPrice *= 1.5;
            break;
    }
    
    return finalPrice;
}

async function loadAnnouncements() {
    try {
        const res = await fetch(`${API_URL}/announcements`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const announcements = await res.json();
        const container = document.getElementById('announcementsList');
        container.innerHTML = '';

        announcements.forEach(item => {
            const div = document.createElement('div');
            div.className = 'announcement-card';
            div.innerHTML = `
                <h5>${item.title}</h5>
                <p>${item.content}</p>
                <small>${new Date(item.createdAt).toLocaleString()}</small>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error('Duyurular yüklenemedi:', err);
    }
}

function addToCart(eventId) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    fetch(`${API_URL}/events`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
        .then(res => res.json())
        .then(events => {
            const selected = events.find(e => e.id === eventId);
            if (!selected) return alert("Etkinlik bulunamadı");

            const ticketType = document.getElementById(`ticketType-${eventId}`).value;

            let finalPrice = selected.price;
            if (ticketType === 'student') finalPrice *= 0.5;
            else if (ticketType === 'vip') finalPrice *= 1.5;

            const existing = cart.find(item => item.id === eventId && item.ticketType === ticketType);
            if (existing) {
                existing.count += 1;
            } else {
                cart.push({
                    id: selected.id,
                    name: selected.name,
                    ticketType,
                    count: 1,
                    unitPrice: finalPrice
                });
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            alert('Etkinlik sepete eklendi!');
            renderCart();
        });
}

function renderCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('cartItems');
    container.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const div = document.createElement('div');
        const subtotal = item.unitPrice * item.count;
        total += subtotal;

        div.innerHTML = `
            <p><strong>${item.name}</strong> (${item.ticketType}) - ${item.count} adet - ${subtotal.toFixed(2)}₺</p>
        `;
        container.appendChild(div);
    });

    const totalDiv = document.createElement('p');
    totalDiv.innerHTML = `<strong>Toplam:</strong> ${total.toFixed(2)}₺`;
    container.appendChild(totalDiv);
}

async function checkout() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) return alert("Sepet boş!");

    const res = await fetch(`${API_URL}/buy-tickets`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cart })
    });

    const result = await res.json();
    if (!res.ok) return alert(result.message || "Hata oluştu");

    alert("Biletler başarıyla alındı!");
    localStorage.removeItem('cart');
    renderCart();
    loadEvents();
}

async function loadPendingUsers() {
    try {
        const res = await fetch(`${API_URL}/admin/pending-users`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const users = await res.json();
        const container = document.getElementById('pendingUsers');
        container.innerHTML = '';

        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'pending-user';
            card.innerHTML = `
                <p><strong>${user.email}</strong></p>
                <button onclick="approveUser('${user.id}')">Onayla</button>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Bekleyen kullanıcılar yüklenemedi:', err);
    }
}

async function approveUser(userId) {
    try {
        const res = await fetch(`${API_URL}/admin/approve-user/${userId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await res.json();
        alert(result.message);
        loadPendingUsers();
    } catch (err) {
        alert('Onaylama sırasında hata oluştu!');
        console.error(err);
    }
}

async function loadSuggestedEvents(interest) {
    console.log("Kullanıcının ilgi alanı:", interest);

    try {
        const res = await fetch(`${API_URL}/events`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const events = await res.json();
        console.log("Tüm etkinlikler:", events);

        const list = document.getElementById('suggestedEventsList');
        list.innerHTML = '';

        if (!interest) {
            list.innerHTML = "<p>İlgi alanınız bulunamadı.</p>";
            return;
        }

        const filtered = events.filter(e => e.type?.toLowerCase() === interest.toLowerCase());

        if (filtered.length === 0) {
            list.innerHTML = "<p>İlgi alanınıza uygun etkinlik bulunamadı.</p>";
            return;
        }

        const defaultImages = {
            'Müzik': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
            'Outdoor': 'https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=800',
            'Konferans': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
            'Tiyatro': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800'
        };

        filtered.forEach(ev => {
            const div = document.createElement('div');
            div.className = 'event-card';
            const imageUrl = ev.image || defaultImages[ev.type] || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800';
            div.innerHTML = `
                <img src="${imageUrl}" alt="${ev.name}"/>
                <div class="card-body">
                    <h3>${ev.name}</h3>
                    <p><strong>Tarih:</strong> ${new Date(ev.date).toLocaleDateString('tr-TR')}</p>
                    <p><strong>Şehir:</strong> ${ev.city}</p>
                    <p><strong>Açıklama:</strong> ${ev.description}</p>
                    <p><strong>Fiyat:</strong> ${ev.price}₺</p>
                </div>
            `;
            list.appendChild(div);
        });

    } catch (err) {
        console.error('İlginizi çekecek etkinlikler yüklenemedi:', err);
    }
}


