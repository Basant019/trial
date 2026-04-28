// ===================== SKYSAFE DISASTER MAP JS - INDIA ONLY =====================

// ── INDIA GEOGRAPHIC BOUNDARIES ──
const INDIA_BOUNDS = {
  north: 35.674545,
  south: 6.232527,
  east: 97.395561,
  west: 68.111378
};

// Check if coordinates are within India
function isInIndia(lat, lon) {
  return lat >= INDIA_BOUNDS.south && 
         lat <= INDIA_BOUNDS.north && 
         lon >= INDIA_BOUNDS.west && 
         lon <= INDIA_BOUNDS.east;
}

// ── CONFIGURATION ──
const EONET_GEOJSON_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events/geojson';

const DISASTER_ICONS = {
  'severeStorms': { icon: '⛈', color: '#00c8ff', name: 'Severe Storm' },
  'wildfires': { icon: '🔥', color: '#ff2244', name: 'Wildfire' },
  'floods': { icon: '🌊', color: '#0055ff', name: 'Flood' },
  'earthquakes': { icon: '🌋', color: '#ff8800', name: 'Earthquake' },
  'volcanoes': { icon: '🌋', color: '#ff4400', name: 'Volcano' },
  'landslides': { icon: '🏔', color: '#8b4513', name: 'Landslide' },
  'drought': { icon: '🏜', color: '#d4a574', name: 'Drought' },
  'dustHaze': { icon: '🌫', color: '#a0a0a0', name: 'Dust/Haze' },
  'snow': { icon: '❄️', color: '#e0e0e0', name: 'Snow/Ice' },
  'extremeTemperature': { icon: '🌡', color: '#ff6b35', name: 'Extreme Temp' },
  'manmade': { icon: '⚠️', color: '#ffcc00', name: 'Manmade' },
  'waterColor': { icon: '💧', color: '#4fc3f7', name: 'Water Color' },
  'icebergs': { icon: '🧊', color: '#b3e5fc', name: 'Iceberg' }
};

let map;
let disasterLayer;
let currentDisasters = [];
let userMarker = null;

// ── INITIALIZE MAP ──
function initMap() {
  if(map) {
    // If map exists, just invalidate size and return
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return;
  }
  
  // Center on India
  map = L.map('disasterMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([22.5937, 78.9629], 5);

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  
  L.control.attribution({
    position: 'bottomright',
    prefix: 'SkySafe India | NASA EONET'
  }).addTo(map);

  // Use CartoDB Dark (free tier, no API key needed)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  disasterLayer = L.layerGroup().addTo(map);
  
  // Add India boundary rectangle (visual indicator)
  const indiaBounds = [[INDIA_BOUNDS.south, INDIA_BOUNDS.west], [INDIA_BOUNDS.north, INDIA_BOUNDS.east]];
  L.rectangle(indiaBounds, {
    color: '#00c8ff',
    weight: 1,
    fillOpacity: 0.05,
    dashArray: '5, 10'
  }).addTo(map);
  
  map.on('click', () => {
    closeCityPanel();
    document.querySelectorAll('.map-disaster-item').forEach(el => el.classList.remove('active'));
  });

  loadMapDisasterData();
}

// ── LOAD DISASTER DATA - INDIA ONLY ──
async function loadMapDisasterData() {
  try {
    const response = await fetch(`${EONET_GEOJSON_URL}?status=open&limit=100`);
    if(!response.ok) throw new Error('Failed to fetch NASA data');
    
    const geojson = await response.json();
    
    disasterLayer.clearLayers();
    currentDisasters = [];
    
    geojson.features.forEach((feature, index) => {
      const props = feature.properties;
      const geometry = feature.geometry;
      
      let coords;
      let lat, lon;
      
      if(geometry.type === 'Point') {
        lon = geometry.coordinates[0];
        lat = geometry.coordinates[1];
        coords = [lat, lon];
      } else if(geometry.type === 'Polygon') {
        const bounds = L.polygon(geometry.coordinates[0].map(c => [c[1], c[0]])).getBounds();
        coords = bounds.getCenter();
        lat = coords[0];
        lon = coords[1];
      } else {
        return;
      }
      
      // FILTER: Only include disasters within India
      if(!isInIndia(lat, lon)) return;
      
      const severity = determineMapSeverity(props);
      const categoryId = props.categories?.[0]?.id || 'unknown';
      const categoryInfo = DISASTER_ICONS[categoryId] || { icon: '📍', color: '#00c8ff', name: 'Unknown' };
      
      const disaster = {
        id: props.id || `EONET_${index}`,
        title: props.title || 'Unknown Event',
        description: props.description || '',
        category: categoryInfo.name,
        icon: categoryInfo.icon,
        severity: severity,
        coords: coords,
        date: props.date || new Date().toISOString(),
        link: props.link || '',
        sources: props.sources || []
      };
      
      currentDisasters.push(disaster);
      addDisasterMarker(disaster);
    });
    
    updateMapSidebar();
    
  } catch(error) {
    console.error('Error loading disaster data:', error);
    const sidebar = document.getElementById('sidebarDisasters');
    if(sidebar) {
      sidebar.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ff4466;">
          <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 12px;"></i>
          <div>Failed to load disaster data</div>
          <button onclick="loadMapDisasterData()" style="margin-top: 16px; padding: 8px 16px; background: rgba(255,68,102,0.2); border: 1px solid rgba(255,68,102,0.3); color: #ff4466; border-radius: 6px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  }
}

function determineMapSeverity(props) {
  const title = (props.title || '').toLowerCase();
  const magnitude = props.magnitudeValue;
  
  if(magnitude) {
    if(magnitude >= 7) return 'extreme';
    if(magnitude >= 5) return 'severe';
    if(magnitude >= 3) return 'moderate';
  }
  
  if(title.includes('major') || title.includes('severe') || title.includes('catastrophic')) return 'extreme';
  if(title.includes('strong') || title.includes('heavy') || title.includes('large')) return 'severe';
  if(title.includes('moderate') || title.includes('medium')) return 'moderate';
  
  return 'moderate';
}

function getSeverityColor(severity) {
  const colors = {
    extreme: '#ff2244',
    severe: '#ff8800',
    moderate: '#ffcc00',
    low: '#00c8ff'
  };
  return colors[severity] || '#00c8ff';
}

// ── ADD DISASTER MARKER ──
function addDisasterMarker(disaster) {
  const color = getSeverityColor(disaster.severity);
  
  const customIcon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin ${disaster.severity}" style="background: ${color};">
        <span class="marker-icon">${disaster.icon}</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
  
  const marker = L.marker(disaster.coords, { icon: customIcon });
  
  const popupContent = `
    <div class="popup-title">${disaster.icon} ${disaster.title}</div>
    <div class="popup-content">
      <strong>Type:</strong> ${disaster.category}<br>
      <strong>Location:</strong> ${disaster.coords[0].toFixed(4)}°N, ${disaster.coords[1].toFixed(4)}°E<br>
      <strong>Reported:</strong> ${timeAgoMap(disaster.date)}<br>
      ${disaster.description ? `<strong>Details:</strong> ${disaster.description}<br>` : ''}
      <span class="popup-sev ${disaster.severity}" style="background: ${color}20; color: ${color}; border: 1px solid ${color}40;">
        ${disaster.severity.toUpperCase()}
      </span>
    </div>
  `;
  
  marker.bindPopup(popupContent);
  
  marker.on('click', () => {
    highlightMapDisaster(disaster.id);
  });
  
  disasterLayer.addLayer(marker);
  disaster.marker = marker;
}

// ── UPDATE SIDEBAR ──
function updateMapSidebar() {
  const container = document.getElementById('sidebarDisasters');
  if(!container) return;
  
  if(currentDisasters.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #445566;">
        <i class="fas fa-check-circle" style="font-size: 2rem; color: #00ff88; margin-bottom: 12px;"></i>
        <div>No active disasters in India</div>
        <div style="font-size: 0.7rem; margin-top: 8px; color: #334455;">India boundary shown on map</div>
      </div>
    `;
    return;
  }
  
  const sorted = [...currentDisasters].sort((a, b) => {
    const severityOrder = { extreme: 0, severe: 1, moderate: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  container.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-title">DISASTERS IN INDIA</div>
      <div class="disaster-count">${sorted.length} ACTIVE</div>
    </div>
    ${sorted.map(d => `
      <div class="map-disaster-item" id="map-disaster-${d.id}" onclick="focusOnMapDisaster('${d.id}')">
        <div class="md-stripe ${d.severity}" style="background: ${getSeverityColor(d.severity)};"></div>
        <div class="md-body">
          <div class="md-icon ${d.severity}" style="background: ${getSeverityColor(d.severity)}20; color: ${getSeverityColor(d.severity)};">
            ${d.icon}
          </div>
          <div class="md-info">
            <div class="md-name">${d.title}</div>
            <div class="md-loc">${d.coords[0].toFixed(2)}°N, ${d.coords[1].toFixed(2)}°E • ${timeAgoMap(d.date)}</div>
          </div>
          <div class="md-sev ${d.severity}" style="background: ${getSeverityColor(d.severity)}20; color: ${getSeverityColor(d.severity)}; border: 1px solid ${getSeverityColor(d.severity)}40;">
            ${d.severity.toUpperCase()}
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

function timeAgoMap(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if(diffMins < 60) return `${diffMins}m ago`;
  if(diffHours < 24) return `${diffHours}h ago`;
  if(diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ── INTERACTION FUNCTIONS ──
function focusOnMapDisaster(id) {
  const disaster = currentDisasters.find(d => d.id === id);
  if(!disaster || !disaster.marker) return;
  
  highlightMapDisaster(id);
  
  map.flyTo(disaster.coords, 10, { duration: 1.5 });
  
  setTimeout(() => {
    disaster.marker.openPopup();
  }, 1600);
}

function highlightMapDisaster(id) {
  document.querySelectorAll('.map-disaster-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`map-disaster-${id}`);
  if(el) {
    el.classList.add('active');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ── LOCATION & SEARCH FUNCTIONS ──
function locateUser() {
  const btn = document.getElementById('locateBtn');
  if(!btn) return;
  
  btn.classList.add('loading');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SCANNING...';
  
  if(!navigator.geolocation) {
    showToast('Geolocation not supported by your browser', 'red');
    resetLocateBtn();
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const userCoords = [lat, lng];
      
      // Check if user is in India
      const inIndia = isInIndia(lat, lng);
      
      if(userMarker) {
        map.removeLayer(userMarker);
      }
      
      userMarker = L.marker(userCoords, {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: `<div style="width: 20px; height: 20px; background: ${inIndia ? '#00c8ff' : '#ff2244'}; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 20px ${inIndia ? '#00c8ff' : '#ff2244'};"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(map);
      
      const msg = inIndia ? 
        '<strong>Your Location</strong><br>Scanning for nearby disasters in India...' : 
        '<strong>Your Location</strong><br>⚠️ You are outside India. Showing India disasters only.';
      
      userMarker.bindPopup(msg).openPopup();
      
      if(inIndia) {
        map.flyTo(userCoords, 8, { duration: 1.5 });
        setTimeout(() => {
          findNearbyDisasters(userCoords);
        }, 1600);
      } else {
        map.flyTo([22.5937, 78.9629], 5, { duration: 1.5 });
        showToast('⚠️ You are outside India. Showing India region.', 'orange');
      }
      
      resetLocateBtn();
    },
    (error) => {
      showToast('Unable to retrieve your location: ' + error.message, 'red');
      resetLocateBtn();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function resetLocateBtn() {
  const btn = document.getElementById('locateBtn');
  if(!btn) return;
  
  btn.classList.remove('loading');
  btn.innerHTML = '<i class="fas fa-crosshairs"></i> LOCATE ME & SCAN AREA';
}

function findNearbyDisasters(userCoords) {
  const nearby = currentDisasters.map(d => {
    const distance = calculateDistance(userCoords[0], userCoords[1], d.coords[0], d.coords[1]);
    return { ...d, distance };
  }).filter(d => d.distance < 500) // 500km radius within India
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
  
  if(nearby.length > 0) {
    showToast(`⚠️ Found ${nearby.length} disasters within 500km`, 'orange');
    
    const nearest = nearby[0];
    setTimeout(() => {
      focusOnMapDisaster(nearest.id);
    }, 500);
    
    showCityEmergencyPanel('Your Location', nearest.severity, nearby);
  } else {
    showToast('✅ No disasters detected within 500km radius', 'green');
    showCityEmergencyPanel('Your Location', 'safe', []);
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ── CITY SEARCH & EMERGENCY PANEL ──
function searchCity() {
  const input = document.getElementById('citySearchInput');
  if(!input) return;
  
  const query = input.value.trim();
  if(!query) {
    showToast('Please enter a city name', 'orange');
    return;
  }
  
  // Add ", India" to search for Indian cities
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', India')}`)
    .then(res => res.json())
    .then(data => {
      if(data && data.length > 0) {
        // Find first result within India
        const indiaResult = data.find(r => {
          const lat = parseFloat(r.lat);
          const lon = parseFloat(r.lon);
          return isInIndia(lat, lon);
        }) || data[0];
        
        const result = indiaResult;
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        if(!isInIndia(lat, lon)) {
          showToast('⚠️ City outside India. Showing India region.', 'orange');
        }
        
        flyToCity([lat, lon], 10, result.display_name.split(',')[0]);
        checkCityDisasters([lat, lon], result.display_name.split(',')[0]);
      } else {
        showToast('City not found in India', 'red');
      }
    })
    .catch(err => {
      console.error('Geocoding error:', err);
      showToast('Failed to search city', 'red');
    });
}

function flyToCity(coords, zoom, cityName) {
  if(!map) return;
  
  // Ensure we stay within India bounds for initial view
  map.flyTo(coords, zoom, { duration: 1.5 });
  
  document.querySelectorAll('.city-chip').forEach(chip => {
    chip.classList.remove('active');
    if(chip.textContent === cityName) chip.classList.add('active');
  });
}

function checkCityDisasters(coords, cityName) {
  const nearby = currentDisasters.map(d => {
    const distance = calculateDistance(coords[0], coords[1], d.coords[0], d.coords[1]);
    return { ...d, distance };
  }).filter(d => d.distance < 300) // 300km radius
    .sort((a, b) => a.distance - b.distance);
  
  if(nearby.length > 0) {
    const maxSeverity = nearby.reduce((max, d) => {
      const order = { extreme: 3, severe: 2, moderate: 1, low: 0 };
      return order[d.severity] > order[max] ? d.severity : max;
    }, 'low');
    
    showCityEmergencyPanel(cityName, maxSeverity, nearby);
  } else {
    showCityEmergencyPanel(cityName, 'safe', []);
  }
}

function showCityEmergencyPanel(cityName, status, disasters) {
  const panel = document.getElementById('cityEmergencyPanel');
  const nameEl = document.getElementById('cepCityName');
  const statusEl = document.getElementById('cepStatus');
  const statusValEl = document.getElementById('cepStatusValue');
  const alertsEl = document.getElementById('cepAlerts');
  
  if(!panel) return;
  
  if(nameEl) nameEl.textContent = cityName.toUpperCase();
  
  if(status === 'safe') {
    if(statusEl) statusEl.classList.add('safe');
    if(statusValEl) {
      statusValEl.textContent = 'ALL CLEAR';
      statusValEl.style.color = '#00ff88';
    }
    const iconEl = statusEl?.querySelector('.cep-status-icon');
    if(iconEl) {
      iconEl.innerHTML = '<i class="fas fa-shield-check"></i>';
      iconEl.style.background = 'rgba(0,255,136,0.2)';
      iconEl.style.color = '#00ff88';
    }
  } else {
    if(statusEl) statusEl.classList.remove('safe');
    if(statusValEl) {
      statusValEl.textContent = status.toUpperCase() + ' ALERT';
      statusValEl.style.color = getSeverityColor(status);
    }
    const iconEl = statusEl?.querySelector('.cep-status-icon');
    if(iconEl) {
      iconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
      iconEl.style.background = 'rgba(255,34,68,0.2)';
      iconEl.style.color = '#ff2244';
    }
  }
  
  if(alertsEl) {
    if(disasters.length === 0) {
      alertsEl.innerHTML = `
        <div class="cep-alert-item">
          <span class="cep-alert-icon">✅</span>
          <span class="cep-alert-text">No active threats detected in this area</span>
        </div>
      `;
    } else {
      alertsEl.innerHTML = disasters.slice(0, 4).map(d => `
        <div class="cep-alert-item" onclick="focusOnMapDisaster('${d.id}')">
          <span class="cep-alert-icon">${d.icon}</span>
          <span class="cep-alert-text">${d.title} (${d.distance.toFixed(0)}km away)</span>
        </div>
      `).join('');
    }
  }
  
  panel.classList.add('open');
}

function closeCityPanel() {
  const panel = document.getElementById('cityEmergencyPanel');
  if(panel) panel.classList.remove('open');
}

// Enter key support for city search
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('citySearchInput');
  if(searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if(e.key === 'Enter') searchCity();
    });
  }
});