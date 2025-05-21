const axios = require('axios');
const WEATHER_API_KEY = '2332ca068e99c3f55acb8ed2603ad746';

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const SECRET_KEY = "etkinlik_secret";

function generateToken(user) {
  return jwt.sign(user, SECRET_KEY, { expiresIn: '1d' });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function authorizeAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Yetkisiz erişim' });
  }
  next();
}

// Kalıcı kullanıcı verisi (users.json)
const usersPath = path.join(__dirname, 'users.json');
let users = [];

try {
  if (fs.existsSync(usersPath)) {
    const raw = fs.readFileSync(usersPath);
    users = JSON.parse(raw);
  } else {
    throw new Error("Dosya yok");
  }
} catch (e) {
  console.log("users.json yok veya bozuk. Varsayılan admin oluşturuluyor.");
  users = [
    {
      id: 1,
      email: "superadmin@admin.com",
      password: "admin123",
      role: "admin",
      isApproved: true,
      interest: null
    }
  ];
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

// Etkinlik verisi
let events = [
  {
    id: 1,
    name: "Jazz Konseri",
    description: "Harika bir müzik gecesi",
    date: "2025-05-15",
    type: "Müzik",
    city: "İstanbul",
    price: 100,
    availableSeats: 50,
    image: "",
    createdAt: new Date()
  },
  {
    id: 2,
    name: "Doğa Yürüyüşü",
    description: "Doğayla iç içe bir yürüyüş etkinliği",
    date: "2025-05-18",
    type: "Outdoor",
    city: "Bursa",
    price: 0,
    availableSeats: 100,
    image: "",
    createdAt: new Date()
  },
  {
    id: 3,
    name: "Teknoloji Konferansı",
    description: "Yeni trendler ve teknolojiler",
    date: "2025-05-20",
    type: "Konferans",
    city: "Ankara",
    price: 150,
    availableSeats: 200,
    image: "",
    createdAt: new Date()
  },
  {
    id: 4,
    name: "Tiyatro Gecesi",
    description: "Unutulmaz bir tiyatro deneyimi",
    date: "2025-05-22",
    type: "Tiyatro",
    city: "İzmir",
    price: 80,
    availableSeats: 80,
    image: "",
    createdAt: new Date()
  }
];

const announcements = [
  { title: "Hoşgeldiniz", content: "Etkinlik sistemine hoş geldiniz!", createdAt: new Date() }
];

// Kayıt
app.post('/api/register', (req, res) => {
  const { email, password, interest } = req.body;

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: 'Bu e-posta ile kullanıcı zaten kayıtlı' });
  }

  const newUser = {
    id: users.length + 1,
    email,
    password,
    role: 'user',
    isApproved: false,
    interest: interest || null,
    "isFirstLogin": true
  };

  users.push(newUser);
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

  res.status(201).json({ message: 'Kayıt başarılı, yönetici onayı bekleniyor' });
});

// Giriş
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
  if (!user.isApproved) return res.status(403).json({ message: 'Hesap onay bekliyor' });

  const token = generateToken(user);
  res.json({ token, isFirstLogin: user.isFirstLogin || false });
});

// Etkinlikleri getir
app.get('/api/events', authenticateToken, (req, res) => {
  const sorted = events.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(sorted);
});

// Duyuruları getir
app.get('/api/announcements', authenticateToken, (req, res) => {
  res.json(announcements);
});

// Etkinlikleri getir
// app.get('/api/events', authenticateToken, (req, res) => {
//   const sorted = events.sort((a, b) => new Date(a.date) - new Date(b.date));
//   res.json(sorted);
// });


// Admin: Onay bekleyen kullanıcılar
app.get('/api/admin/pending-users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Yetkisiz' });
  }
  const pending = users.filter(u => !u.isApproved && u.role === 'user');
  res.json(pending);
});

// Admin: Kullanıcı onayla
app.post('/api/admin/approve-user/:userId', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Yetkiniz yok' });
  }

  const userId = parseInt(req.params.userId);
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

  user.isApproved = true;
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  res.json({ message: 'Kullanıcı onaylandı' });
});

//etkinlik ekleme admin panelinden
app.post('/api/admin/events', authenticateToken, authorizeAdmin, (req, res) => {
  const { name, description, date, type, city, price, availableSeats, image } = req.body;
  const newEvent = {
    id: events.length + 1,
    name, description, date, type, city, price,
    availableSeats, image: image || '',
    createdAt: new Date(),
    isPublished: false
  };
  events.push(newEvent);
  res.status(201).json(newEvent);
});

//tüm etkinlikleri getiriyor
app.get('/api/admin/events', authenticateToken, authorizeAdmin, (req, res) => {
  res.json(events);
});

//etkinlik güncelliyor
app.put('/api/admin/events/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const index = events.findIndex(e => e.id === id);
  if (index === -1) return res.status(404).json({ message: 'Etkinlik bulunamadı' });

  events[index] = { ...events[index], ...req.body };
  res.json(events[index]);
});
// etkinlik güncelleme
app.delete('/api/admin/events/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const index = events.findIndex(e => e.id === id);
  if (index === -1) return res.status(404).json({ message: 'Etkinlik bulunamadı' });

  events.splice(index, 1);
  res.json({ message: 'Silindi' });
});
//yayın durumu değişme
app.patch('/api/admin/events/:id/publish', authenticateToken, authorizeAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const event = events.find(e => e.id === id);
  if (!event) return res.status(404).json({ message: 'Etkinlik bulunamadı' });

  event.isPublished = !event.isPublished;
  res.json({ message: `Etkinlik ${event.isPublished ? 'yayınlandı' : 'yayından kaldırıldı'}` });
});
// Admin duyuruları
app.get('/api/admin/announcements', authenticateToken, authorizeAdmin, (req, res) => {
  res.json(announcements);
});

app.post('/api/admin/announcements', authenticateToken, authorizeAdmin, (req, res) => {
  const { title, content } = req.body;
  announcements.push({ title, content, createdAt: new Date() });
  res.status(201).json({ message: 'Eklendi' });
});

app.delete('/api/admin/announcements/:index', authenticateToken, authorizeAdmin, (req, res) => {
  const index = parseInt(req.params.index);
  if (index >= 0 && index < announcements.length) {
    announcements.splice(index, 1);
    res.json({ message: 'Silindi' });
  } else {
    res.status(404).json({ message: 'Duyuru bulunamadı' });
  }
});




// Bilet satın alma
app.post('/api/buy-tickets', authenticateToken, (req, res) => {
  const cart = req.body.cart;

  for (const item of cart) {
    const event = events.find(e => e.id === item.id);
    if (!event) return res.status(404).json({ message: 'Etkinlik bulunamadı' });

    if (event.availableSeats < item.count) {
      return res.status(400).json({ message: `${event.name} için yeterli koltuk yok `});
    }

    event.availableSeats -= item.count;
  }

  res.json({ message: 'Satın alma başarılı' });
});

// Şifre değiştirme
app.post('/api/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
  }

  if (user.password !== currentPassword) {
    return res.status(400).json({ message: 'Mevcut şifre yanlış' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalıdır' });
  }

  user.password = newPassword;
  user.isFirstLogin = false;
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

  res.json({ message: 'Şifre başarıyla değiştirildi' });
});

// Hava durumu
app.get('/api/weather/:city', async (req, res) => {
  const city = req.params.city;

  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: city,
        appid: WEATHER_API_KEY,
        units: 'metric',
        lang: 'tr'
      }
    });

    const weather = response.data;
    const durum = weather.weather[0].main.toLowerCase();

    let message = "Hava etkinlik için uygun.";
    if (durum.includes('rain') || durum.includes('storm') || durum.includes('snow')) {
      message = "⚠ Yağış bekleniyor. Etkinlik ertelenebilir.";
    }

    res.json({
      city: weather.name,
      temp: weather.main.temp,
      condition: weather.weather[0].description,
      message
    });
  } catch (error) {
    res.status(500).json({ message: "Hava durumu alınamadı." });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});



