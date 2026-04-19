const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DBPATH = path.join(__dirname, 'database.sqlite');

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(DBPATH, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      department TEXT NOT NULL,
      role TEXT NOT NULL
    )`);

    // Create Events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT,
      time TEXT,
      location TEXT,
      departmentName TEXT,
      category TEXT,
      price REAL,
      availableTickets INTEGER,
      description TEXT,
      imageUrl TEXT
    )`, (err) => {
      // Seed default events if they don't exist
      if (!err) {
        db.get("SELECT COUNT(*) AS count FROM events", (err, row) => {
          if (row && row.count === 0) {
            const defaultEvents = [
              { 
                name: "Codeathon 2026", date: "2026-05-10", time: "09:00 AM", location: "Block 29, Lab 3",
                departmentName: "CSE", category: "Tech", price: 100, availableTickets: 50,
                description: "An intensive 24-hour coding marathon. Solve real-world university problems.",
                imageUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=600"
              },
              { 
                name: "Aptimind", date: "2026-06-15", time: "02:00 PM", location: "Block 33, Seminar Hall",
                departmentName: "CSE", category: "Seminar", price: 50, availableTickets: 120,
                description: "Test your quantitative and logical reasoning skills in this competitive aptitude test.",
                imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=600"
              },
              { 
                name: "Tantraz", date: "2026-07-20", time: "10:00 AM", location: "Block 4, Main Auditorium",
                departmentName: "CSE", category: "Tech", price: 150, availableTickets: 200,
                description: "The flagship CSE technical symposium featuring paper presentations and project expos.",
                imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600"
              },
              { 
                name: "WebDev Workshop", date: "2026-08-05", time: "11:00 AM", location: "Block 29, Lab 1",
                departmentName: "CSE", category: "Seminar", price: 75, availableTickets: 40,
                description: "Hands-on ReactJS component building and frontend optimization workshop.",
                imageUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=600"
              },
              { 
                name: "AI Symposium & Expo", date: "2026-09-12", time: "10:00 AM", location: "VR Lab, Block 5",
                departmentName: "CSE", category: "Tech", price: 250, availableTickets: 75,
                description: "Explore the cutting-edge of Machine Learning and LLMs with industry experts.",
                imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=600"
              },
              { 
                name: "Cyber Knights CTF", date: "2026-10-31", time: "08:00 PM", location: "Remote / Online",
                departmentName: "CSE", category: "Tech", price: 50, availableTickets: 300,
                description: "A Halloween Capture-The-Flag hacking competition.",
                imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600"
              }
            ];

            const insert = db.prepare("INSERT INTO events (name, date, time, location, departmentName, category, price, availableTickets, description, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            defaultEvents.forEach(ev => {
              insert.run(ev.name, ev.date, ev.time, ev.location, ev.departmentName, ev.category, ev.price, ev.availableTickets, ev.description, ev.imageUrl);
            });
            insert.finalize();
            console.log("Seeded database with default events.");
          }
        });
      }
    });

    // Create Bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId INTEGER NOT NULL,
      customerName TEXT NOT NULL,
      customerEmail TEXT NOT NULL,
      customerDepartment TEXT NOT NULL,
      customerRole TEXT NOT NULL,
      ticketsBought INTEGER NOT NULL,
      totalPaid REAL NOT NULL,
      bookingDate TEXT NOT NULL
    )`);
  }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, department, role } = req.body;
  if (!name || !email || !password || !department || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (name, email, password, department, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, department, role],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Error registering user' });
        }
        res.status(201).json({ message: 'Registration successful', user: { id: this.lastID, name, email, department, role } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const userObj = { id: user.id, name: user.name, email: user.email, department: user.department, role: user.role };
    res.json({ message: 'Login successful', user: userObj });
  });
});

// Events Routes
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/events', (req, res) => {
  const { name, date, time, location, departmentName, category, price, availableTickets, description, imageUrl } = req.body;
  if (!name || !date || !price || !availableTickets) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = 'INSERT INTO events (name, date, time, location, departmentName, category, price, availableTickets, description, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const params = [name, date, time || 'TBA', location || 'TBA', departmentName || 'All', category || 'General', price, availableTickets, description || '', imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600'];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to insert event into database' });
    }
    res.status(201).json({ message: 'Event successfully created', eventId: this.lastID });
  });
});

// Bookings Routes
app.get('/api/bookings/:email', (req, res) => {
  const query = `
    SELECT b.id as bookingId, b.*, e.* 
    FROM bookings b 
    JOIN events e ON b.eventId = e.id 
    WHERE b.customerEmail = ?
  `;
  db.all(query, [req.params.email], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/bookings', (req, res) => {
  const { eventId, customerName, customerEmail, customerDepartment, customerRole, ticketsBought, totalPaid } = req.body;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // Check available tickets
    db.get('SELECT availableTickets FROM events WHERE id = ?', [eventId], (err, event) => {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ error: 'Database error' });
      }
      if (!event || event.availableTickets < ticketsBought) {
        db.run("ROLLBACK");
        return res.status(400).json({ error: 'Not enough tickets available' });
      }

      // Insert booking
      db.run(
        'INSERT INTO bookings (eventId, customerName, customerEmail, customerDepartment, customerRole, ticketsBought, totalPaid, bookingDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [eventId, customerName, customerEmail, customerDepartment, customerRole, ticketsBought, totalPaid, new Date().toISOString()],
        function(err) {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: 'Error processing booking' });
          }
          const bookingId = this.lastID;

          // Update event available tickets
          db.run('UPDATE events SET availableTickets = availableTickets - ? WHERE id = ?', [ticketsBought, eventId], (err) => {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: 'Error updating tickets' });
            }
            db.run("COMMIT");
            res.status(201).json({ message: 'Booking successful', bookingId });
          });
        }
      );
    });
  });
});

app.delete('/api/bookings/:id', (req, res) => {
  const bookingId = req.params.id;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.get('SELECT eventId, ticketsBought FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
      if (err || !booking) {
        db.run("ROLLBACK");
        return res.status(404).json({ error: 'Booking not found' });
      }

      db.run('DELETE FROM bookings WHERE id = ?', [bookingId], (err) => {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: 'Error deleting booking' });
        }

        db.run('UPDATE events SET availableTickets = availableTickets + ? WHERE id = ?', [booking.ticketsBought, booking.eventId], (err) => {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: 'Error restoring tickets' });
          }
          db.run("COMMIT");
          res.json({ message: 'Booking cancelled successfully' });
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
