import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "./api";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Bookings from "./components/Bookings";
import CheckoutModal from "./components/CheckoutModal";
import Toast from "./components/Toast";
import Login from "./components/Login";
import Footer from "./components/Footer";
import AdminDashboard from "./components/AdminDashboard";
import "./App.css"; 

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("veltechUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [currentTab, setCurrentTab] = useState("home");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("veltechUser", JSON.stringify(currentUser));
      fetchBookings();
    } else {
      localStorage.removeItem("veltechUser");
      setBookings([]);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  const fetchBookings = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${currentUser.email}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  const showToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    showToast(`Welcome to the portal, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTab("home");
    setToastMessage("");
  };

  const handleConfirmBooking = async (bookingDetails) => {
    try {
      // Use the eventId parameter instead of putting it on the root
      const payload = {
        ...bookingDetails,
        eventId: bookingDetails.id
      };
      
      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        await fetchEvents();
        await fetchBookings();
        setSelectedEvent(null);
        showToast(`Successfully booked ${bookingDetails.ticketsBought} tickets!`);
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to complete booking', 'error');
      }
    } catch (err) {
      showToast('Network error while booking', 'error');
    }
  };

  const handleCancelBooking = async (eventToCancel) => {
    // The backend provides bookingId representing the row ID in bookings table
    const bookingId = eventToCancel.bookingId;
    if (!bookingId) {
      showToast('Error: Unable to identify booking ID', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        await fetchEvents();
        await fetchBookings();
        showToast(`Cancelled booking for ${eventToCancel.name || 'Event'}`, "error");
      } else {
        showToast('Failed to cancel booking', 'error');
      }
    } catch (err) {
      showToast('Network error while cancelling', 'error');
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Navbar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        bookingCount={bookings.length}
        user={currentUser}
        onLogout={handleLogout}
      />

      <main>
        {currentTab === "home" ? (
          <Home events={events} onBook={setSelectedEvent} bookings={bookings} currentUser={currentUser} />
        ) : currentTab === "admin" ? (
          <AdminDashboard currentUser={currentUser} />
        ) : (
          <Bookings bookings={bookings} onCancel={handleCancelBooking} currentUser={currentUser} />
        )}
      </main>

      <Footer />

      <CheckoutModal 
        event={selectedEvent} 
        currentUser={currentUser}
        onConfirm={handleConfirmBooking} 
        onCancel={() => setSelectedEvent(null)} 
      />

      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />
    </div>
  );
}

export default App;