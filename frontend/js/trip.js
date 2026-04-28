// frontend/js/trip.js

const API_BASE = "http://localhost:5000";

let map = null;
let markersLayer = null;

// ─── Theme Toggle ───────────────────────────────────────────────
const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("skysafe-theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("skysafe-theme", next);
  updateThemeIcon(next);
});

function updateThemeIcon(theme) {
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

// ─── Mobile Menu ──────────────────────────────────────────────
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");

if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
    const icon = mobileMenuBtn.querySelector("i");
    if (mobileMenu.classList.contains("open")) {
      icon.classList.remove("fa-bars");
      icon.classList.add("fa-times");
    } else {
      icon.classList.remove("fa-times");
      icon.classList.add("fa-bars");
    }
  });
}

// ─── Autocomplete for Locations ───────────────────────────────────
const OWM_API_KEY = '85e24fbc730d141f1608cd28e13d5c71';

function setupAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  const wrapper = document.createElement("div");
  wrapper.className = "autocomplete-wrapper";
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);
  
  const list = document.createElement("ul");
  list.className = "autocomplete-list";
  wrapper.appendChild(list);

  let timeout;
  input.addEventListener("input", () => {
    clearTimeout(timeout);
    const query = input.value.trim();
    if (query.length < 2) {
      list.innerHTML = "";
      list.style.display = "none";
      return;
    }
    timeout = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${OWM_API_KEY}`);
        const data = await res.json();
        list.innerHTML = "";
        if (data && data.length > 0) {
          data.forEach(item => {
            const li = document.createElement("li");
            const label = `${item.name}${item.state ? ', ' + item.state : ''}, ${item.country}`;
            li.textContent = label;
            li.addEventListener("click", () => {
              input.value = item.name;
              list.style.display = "none";
            });
            list.appendChild(li);
          });
          list.style.display = "block";
        } else {
          list.style.display = "none";
        }
      } catch (err) {
        list.style.display = "none";
      }
    }, 400);
  });
  
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      list.style.display = "none";
    }
  });
}

setupAutocomplete("currentLocation");
setupAutocomplete("destination");

// ─── Interest Chips ──────────────────────────────────────────────
document.querySelectorAll(".interest-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const cb = chip.querySelector("input[type='checkbox']");
    cb.checked = !cb.checked;
    chip.classList.toggle("checked", cb.checked);
  });
});

// ─── Accordion (Itinerary Days) ──────────────────────────────────
document.addEventListener("click", (e) => {
  if (e.target.closest(".day-header")) {
    const header = e.target.closest(".day-header");
    const body = header.nextElementSibling;
    const isOpen = body.classList.contains("open");
    body.classList.toggle("open", !isOpen);
    header.querySelector(".day-arrow").textContent = isOpen ? "▾" : "▴";
  }
});

// ─── Form Submit ─────────────────────────────────────────────────
document.getElementById("tripForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await planTrip();
});

async function planTrip() {
  const btn = document.getElementById("submitBtn");
  const btnText = document.getElementById("btnText");
  const spinner = document.getElementById("btnSpinner");
  const errorBanner = document.getElementById("errorBanner");
  const results = document.getElementById("results");

  // Gather interests
  const interests = Array.from(
    document.querySelectorAll(".interest-chip input:checked")
  ).map((cb) => cb.value);

  const payload = {
    currentLocation: document.getElementById("currentLocation").value.trim(),
    destination: document.getElementById("destination").value.trim(),
    travelDate: document.getElementById("travelDate").value,
    numDays: parseInt(document.getElementById("numDays").value),
    numPeople: parseInt(document.getElementById("numPeople").value),
    budget: document.getElementById("budget").value,
    interests,
  };

  // Basic validation
  if (!payload.destination || !payload.travelDate) {
    showError("Please fill in Destination and Travel Date.");
    return;
  }

  // Loading state
  btn.disabled = true;
  btnText.textContent = "Planning your trip...";
  spinner.style.display = "block";
  errorBanner.classList.remove("visible");
  results.classList.remove("visible");

  try {
    const response = await fetch(`${API_BASE}/api/trip/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to plan trip. Please try again.");
    }

    renderResults(data);
    
    // Save to local storage for Dashboard
    try {
      const savedTrips = JSON.parse(localStorage.getItem('skysafe_trips') || '[]');
      const newTrip = {
        id: Date.now(),
        trip_name: `Trip to ${data.trip.to}`,
        source_location: data.trip.from,
        destination_location: data.trip.to,
        start_date: data.trip.travelDate,
        end_date: new Date(new Date(data.trip.travelDate).getTime() + (data.trip.numDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        travel_mode: "car",
        budget_level: payload.budget,
        status: "planned",
        traveller_count: data.trip.numPeople,
        created_at: new Date().toISOString()
      };
      savedTrips.push(newTrip);
      localStorage.setItem('skysafe_trips', JSON.stringify(savedTrips));
    } catch (e) {
      console.warn("Could not save trip to local storage", e);
    }

    results.classList.add("visible");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btnText.textContent = "✈️ Plan My Trip";
    spinner.style.display = "none";
  }
}

// ─── Error Handler ───────────────────────────────────────────────
function showError(msg) {
  const banner = document.getElementById("errorBanner");
  banner.textContent = "⚠️ " + msg;
  banner.classList.add("visible");
  banner.scrollIntoView({ behavior: "smooth" });
}

// ─── Render Results ──────────────────────────────────────────────
function renderResults(data) {
  renderTripSummary(data.trip);
  renderWeather(data.weather);
  renderItinerary(data.itinerary);
  renderBudget(data.budgetEstimate, data.trip);
  renderPacking(data.packingList);
  renderSafety(data.safetyTips);
  renderPlaces(data.nearbyPlaces);
  renderMap(data.trip.coordinates, data.nearbyPlaces, data.trip.to);
}

// Trip Summary Bar with Progress
function renderTripSummary(trip) {
  const today = new Date();
  const startDate = new Date(trip.travelDate);
  const endDate = trip.endDate ? new Date(trip.endDate) : new Date(startDate.getTime() + (trip.numDays - 1) * 86400000);

  // Calculate progress
  let daysCovered = 0;
  let daysLeft = trip.numDays;
  let progressPct = 0;
  let progressLabel = "Trip not started yet";

  if (today >= startDate) {
    const msPerDay = 86400000;
    daysCovered = Math.min(Math.floor((today - startDate) / msPerDay) + 1, trip.numDays);
    daysLeft = Math.max(trip.numDays - daysCovered, 0);
    progressPct = Math.round((daysCovered / trip.numDays) * 100);
    progressLabel = daysCovered >= trip.numDays
      ? "Trip Completed! 🎉"
      : `Day ${daysCovered} of ${trip.numDays} — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`;
  }

  document.getElementById("tripSummary").innerHTML = `
    <div class="trip-summary-meta">
      <span>📍 <strong>${trip.from || "Your location"}</strong> → <strong>${trip.to}</strong></span>
      <span>📅 ${formatDate(trip.travelDate)} → ${formatDate(endDate.toISOString().split("T")[0])}</span>
      <span>🗓 <strong>${trip.numDays}</strong> Day${trip.numDays > 1 ? "s" : ""}</span>
      <span>👥 <strong>${trip.numPeople}</strong> Person${trip.numPeople > 1 ? "s" : ""}</span>
      <span>💰 ${capitalize(trip.budget)} Budget</span>
    </div>
    <div class="trip-progress-wrap">
      <div class="trip-progress-labels">
        <span class="trip-progress-label-text">${progressLabel}</span>
        <span class="trip-progress-pct">${progressPct}%</span>
      </div>
      <div class="trip-progress-bar-bg">
        <div class="trip-progress-bar-fill" style="width: ${progressPct}%"></div>
      </div>
      <div class="trip-progress-days">
        ${Array.from({ length: trip.numDays }, (_, i) => {
          const isDone = i < daysCovered;
          const isToday = i === daysCovered - 1 && daysCovered < trip.numDays;
          return `<div class="trip-day-dot ${isDone ? 'done' : ''} ${isToday ? 'today' : ''}" title="Day ${i + 1}">
            <span>${i + 1}</span>
          </div>`;
        }).join("")}
      </div>
    </div>
  `;
}

// Itinerary with themes
function renderItinerary(itinerary) {
  const container = document.getElementById("itineraryContainer");
  container.innerHTML = itinerary.map((day, idx) => `
    <div class="itinerary-day fade-in">
      <div class="day-header" id="dayHeader${day.day}">
        <div class="day-header-left">
          <span class="day-number">Day ${day.day}</span>
          <span class="day-theme-badge">${day.theme || "Planned Activities"}</span>
        </div>
        <span class="day-arrow">${idx === 0 ? "▾" : "▴"}</span>
      </div>
      <div class="day-body ${idx === 0 ? "open" : ""}">
        <div class="day-notes">
          <span class="day-note">🌅 <strong>Morning:</strong> ${day.morningNote}</span>
          <span class="day-note">☀️ <strong>Afternoon:</strong> ${day.afternoonNote}</span>
          <span class="day-note">🌆 <strong>Evening:</strong> ${day.eveningNote}</span>
        </div>
        <div class="timeline">
          ${day.timeline.map(t => `
            <div class="timeline-event ${t.type === 'break' ? 'break-event' : ''}">
              <div class="timeline-time">${t.time}</div>
              <div class="timeline-icon ${t.type}">${t.type === 'activity' ? '📍' : '☕'}</div>
              <div class="timeline-content">
                <h4>${t.title}</h4>
                ${t.place ? `
                  <p><strong>${t.place.name}</strong></p>
                  <p style="font-size:0.82rem;color:var(--text-secondary)">${t.place.description || ''}</p>
                ` : `<p>${t.note}</p>`}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `).join("");
}

// Weather
function renderWeather(weather) {
  const safetyClass = weather.safetyStatus; // safe | caution | danger
  const safetyEmoji = { safe: "✅", caution: "⚠️", danger: "🚨" };

  document.getElementById("weatherCard").innerHTML = `
    <div class="weather-banner">
      <div class="weather-icon">
        <img src="${weather.icon}" alt="${weather.description}" onerror="this.style.display='none'">
      </div>
      <div class="weather-info">
        <h2>${Math.round(weather.temperature)}°C</h2>
        <p>${weather.description}</p>
        <div class="weather-meta">
          <span>🌡 Feels ${Math.round(weather.feelsLike)}°C</span>
          <span>💧 Humidity ${weather.humidity}%</span>
          <span>💨 Wind ${weather.windSpeed} m/s</span>
        </div>
      </div>
    </div>
    <div class="safety-badge ${safetyClass}">
      ${safetyEmoji[safetyClass] || "ℹ️"} ${weather.safetyMessage}
    </div>
  `;
}



// Budget
function renderBudget(budget, trip) {
  document.getElementById("budgetCard").innerHTML = `
    <table class="budget-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Est. Cost (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>🍽 Food & Dining</td><td>₹${budget.food.toLocaleString()}</td></tr>
        <tr><td>🏨 Accommodation</td><td>₹${budget.stay.toLocaleString()}</td></tr>
        <tr><td>🚌 Transport</td><td>₹${budget.transport.toLocaleString()}</td></tr>
        <tr><td>🎟 Activities</td><td>₹${budget.activities.toLocaleString()}</td></tr>
        <tr><td><strong>Total (${trip.numPeople} pax, ${trip.numDays} days)</strong></td><td><strong>₹${budget.total.toLocaleString()}</strong></td></tr>
      </tbody>
    </table>
    <div class="budget-highlight">
      <div class="total-amt">₹${budget.perPersonPerDay.toLocaleString()}</div>
      <div class="total-label">Per person, per day (${capitalize(trip.budget)} budget)</div>
    </div>
  `;
}

// Packing
function renderPacking(list) {
  document.getElementById("packingList").innerHTML = `
    <ul class="checklist">
      ${list.map(item => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

// Safety
function renderSafety(tips) {
  document.getElementById("safetyList").innerHTML = `
    <ul class="safety-list">
      ${tips.map(tip => `<li>${tip}</li>`).join("")}
    </ul>
  `;
}

// Nearby Places Grid
function renderPlaces(places) {
  const container = document.getElementById("placesList");
  if (!places || places.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">No places data available for this destination.</p>`;
    return;
  }

  container.innerHTML = `<div class="place-list">${places.map(p => `
    <div class="place-card fade-in">
      ${p.image
        ? `<img class="place-card-img" src="${p.image}" alt="${p.name}" onerror="this.outerHTML='<div class=\\'place-card-img\\'>🏛️</div>'">`
        : `<div class="place-card-img">🏛️</div>`
      }
      <div class="place-card-body">
        <h4>${p.name}</h4>
        <p>${p.description || "A notable tourist attraction."}</p>
        ${p.kinds ? `<span class="place-tag">${p.kinds.split(",")[0].replace(/_/g," ")}</span>` : ""}
      </div>
    </div>
  `).join("")}</div>`;
}

// Map
function renderMap(coords, places, destinationName) {
  if (map) {
    map.remove();
    map = null;
  }

  map = L.map("trip-map").setView([coords.lat, coords.lon], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  // Main destination marker (blue)
  const destIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  L.marker([coords.lat, coords.lon], { icon: destIcon })
    .addTo(map)
    .bindPopup(`<strong>📍 ${destinationName}</strong><br>Your destination`)
    .openPopup();

  // Place markers (red/green)
  if (places && places.length > 0) {
    const bounds = [[coords.lat, coords.lon]];

    places.forEach((place, i) => {
      if (!place.lat || !place.lon) return;

      const placeIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      L.marker([place.lat, place.lon], { icon: placeIcon })
        .addTo(map)
        .bindPopup(`
          <strong>${place.name}</strong><br>
          <small style="color:#666">${place.address || ""}</small>
        `);

      bounds.push([place.lat, place.lon]);
    });

    // Fit map to all markers
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }
}

// ─── Utilities ───────────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

// Set min date to today
document.getElementById("travelDate").min = new Date().toISOString().split("T")[0];