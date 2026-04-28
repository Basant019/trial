let user = document.querySelector("#uname");
let username = localStorage.getItem("uname");

if (user) {
    user.textContent = username || "Guest";
}
const apiKey = "85e24fbc730d141f1608cd28e13d5c71";
const city = localStorage.getItem("selectedCity");

if (!city) {
    alert("No city selected. Please search weather first.");
    window.location.href = "weather.html";
}

document.getElementById("cityTitle").innerText = `${city} – 5 Day Forecast`;

async function loadForecast() {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    const grid = document.getElementById("forecastGrid");
    grid.innerHTML = "";

    // One forecast per day (every 24 hours)
    for (let i = 0; i < data.list.length; i += 8) {
        const item = data.list[i];
        const date = new Date(item.dt_txt).toDateString();
        const temp = item.main.temp;
        const weather = item.weather[0].main;

        let icon = "🌤";
        if (weather.includes("Rain")) icon = "🌧";
        if (weather.includes("Cloud")) icon = "☁️";
        if (weather.includes("Clear")) icon = "☀️";
        if (weather.includes("Storm")) icon = "⛈";
        if (weather.includes("Snow")) icon = "❄️";

        grid.innerHTML += `
            <div class="col-md-4 col-lg-2 col-6">
                <div class="forecast-card">
                    <div class="date">${date.split(" ")[0]}</div>
                    <div class="forecast-icon">${icon}</div>
                    <div class="temp">${temp}°C</div>
                    <div class="desc">${weather}</div>
                </div>
            </div>
        `;
    }
}

loadForecast();

// ==================== LIVE ALERT NOTIFICATION SYSTEM ====================
async function checkLiveAlerts() {
    try {
        const url = 'http://localhost:5000/api/disasters?location=' + (city || '');
        const res = await fetch(url);
        if (!res.ok) return;
        const result = await res.json();
        
        if (result.success && result.alerts && result.alerts.length > 0) {
            // Find critical or high severity alerts first
            const primaryAlert = result.alerts.find(a => a.severity === 'Critical') || 
                                 result.alerts.find(a => a.severity === 'High') || 
                                 result.alerts[0];
            
            showLiveAlertBanner(primaryAlert);
        }
    } catch (err) {
        console.error('Failed to fetch live alerts', err);
    }
}

function showLiveAlertBanner(alertData) {
    const banner = document.createElement('div');
    banner.className = 'live-alert-banner shadow-lg text-white font-weight-bold d-flex justify-content-between align-items-center p-3 mb-3';
    
    // Default to a dark orange/red scheme but vary by severity
    let bgColor = 'linear-gradient(90deg, #dc3545 0%, #ff4444 100%)';
    let icon = '⚠️';
    
    if (alertData.severity === 'Critical') {
        bgColor = 'linear-gradient(90deg, #8b0000 0%, #dc3545 100%)';
        icon = '🚨';
        banner.style.animation = 'pulse 1s infinite alternate';
    } else if (alertData.severity === 'Moderate' || alertData.severity === 'Low') {
        bgColor = 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%)';
        icon = '🔔';
    }

    banner.style.background = bgColor;
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.width = '100%';
    banner.style.zIndex = '9999';
    banner.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    
    banner.innerHTML = `
        <div style="flex-grow: 1; text-align: center;">
            <span style="font-size: 1.2rem; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">
                ${icon} <strong>${alertData.alert_type.toUpperCase()} ALERT (${alertData.severity}) in ${alertData.location}</strong>: ${alertData.description}
            </span>
        </div>
        <button style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 0 15px;" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add pulsing animation specifically for critical alerts
    if (!document.getElementById('alert-anim-styles')) {
        const style = document.createElement('style');
        style.id = 'alert-anim-styles';
        style.innerHTML = `
            @keyframes pulse {
                from { opacity: 1; transform: scaleY(1); }
                to { opacity: 0.95; transform: scaleY(0.98); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(banner);
}

// Check for live alerts instantly when page loads
checkLiveAlerts();
