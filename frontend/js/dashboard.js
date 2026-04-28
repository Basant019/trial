/**
 * SkySafe Dashboard JS v2.0
 * Handles: JWT auth, role-based UI, live alert banner,
 *          disaster reports, trip management
 */

const API = 'http://localhost:5000/api';

// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
let currentUser = null;
let currentToken = null;
let allReports   = [];
let allTrips     = [];
let reportStats  = {};

// ═══════════════════════════════════════════════════════
//  AUTH HELPERS
// ═══════════════════════════════════════════════════════
function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` };
}
async function authFetch(url, options = {}) {
    const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
    return res.json();
}

// ═══════════════════════════════════════════════════════
//  LIVE ALERT BANNER
// ═══════════════════════════════════════════════════════
async function fetchAndShowLiveAlerts() {
    try {
        const data = await authFetch(`${API}/disasters?active=true&limit=5`);
        const alerts = data.alerts || data.data || [];
        if (!alerts.length) return;

        // Find the critical/high one first
        const top = alerts.find(a => a.severity === 'critical') ||
                    alerts.find(a => a.severity === 'high') ||
                    alerts[0];
        if (!top) return;

        const severityColor = {
            critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981'
        };
        const color = severityColor[top.severity] || '#f59e0b';

        const banner = document.createElement('div');
        banner.id = 'liveAlertBanner';
        banner.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
            background: linear-gradient(90deg, ${color}22, ${color}44, ${color}22);
            border-bottom: 2px solid ${color};
            padding: 10px 20px;
            display: flex; align-items: center; gap: 14px;
            font-family: Inter, sans-serif; font-size: 13px;
            animation: bannerSlide 0.4s ease;
            backdrop-filter: blur(8px);
        `;
        banner.innerHTML = `
            <style>@keyframes bannerSlide { from { transform: translateY(-100%); } to { transform: translateY(0); } }</style>
            <span style="font-size:20px">⚠️</span>
            <div style="flex:1">
                <strong style="color:${color}; text-transform:uppercase; font-size:11px; letter-spacing:1px">LIVE DISASTER ALERT</strong>
                <div style="color:#e2e8f0; margin-top:2px">
                    <strong>${top.alert_type?.toUpperCase() || 'ALERT'}</strong> in <strong>${top.location}</strong> — 
                    Severity: <span style="color:${color}; font-weight:700">${top.severity?.toUpperCase()}</span>
                    ${top.description ? ` · ${top.description.slice(0,100)}...` : ''}
                </div>
            </div>
            ${alerts.length > 1 ? `<span style="color:${color}; font-size:12px; font-weight:600">+${alerts.length-1} more alerts</span>` : ''}
            <a href="alert.html" style="background:${color}; color:#fff; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; text-decoration:none;">View All</a>
            <button onclick="document.getElementById('liveAlertBanner').remove()" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer; line-height:1">×</button>
        `;
        document.body.insertBefore(banner, document.body.firstChild);
        // Push content down
        const navbar = document.querySelector('.navbar') || document.querySelector('nav');
        if (navbar) navbar.style.marginTop = '50px';
    } catch (e) {
        console.warn('Could not fetch live alerts:', e.message);
    }
}

// ═══════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    currentToken = localStorage.getItem('skysafe_token');
    currentUser  = JSON.parse(localStorage.getItem('skysafe_user') || 'null');

    if (!currentToken || !currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // If admin tries to use user dashboard, redirect to admin dashboard
    if (currentUser.role === 'admin') {
        // Allow admin to view user dashboard too — just show admin controls
    }

    initNavbar();
    fetchAndShowLiveAlerts();

    if (currentUser.role === 'admin') renderAdminDashboard();
    else renderUserDashboard();

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
});

// ═══════════════════════════════════════════════════════
//  NAVBAR
// ═══════════════════════════════════════════════════════
function initNavbar() {
    const name = currentUser.full_name || 'User';
    document.getElementById('navUserName').textContent = name;
    document.getElementById('navAvatar').textContent   = name.charAt(0).toUpperCase();

    const badge = document.getElementById('roleBadge');
    if (currentUser.role === 'admin') {
        badge.textContent = '⚡ Admin';
        badge.classList.add('admin');
        // Show admin nav link
        const adminNav = document.getElementById('adminNavItem');
        if (adminNav) adminNav.style.display = 'list-item';
        // Also show in mobile drawer
        const mobileAdminLink = document.getElementById('mobileAdminLink');
        if (mobileAdminLink) mobileAdminLink.style.display = 'flex';
    } else {
        badge.textContent = '👤 User';
        badge.classList.add('user');
    }
}

// ═══════════════════════════════════════════════════════
//  ██████  USER DASHBOARD
// ═══════════════════════════════════════════════════════
async function renderUserDashboard() {
    document.getElementById('dashTitle').textContent    = `Hello, ${currentUser.full_name.split(' ')[0]}!`;
    document.getElementById('dashSubtitle').textContent = 'Manage your reports and trips below';

    document.getElementById('headerAction').innerHTML = `
        <button class="btn btn-primary" onclick="openModal('reportModal')">
            <i class="fas fa-circle-exclamation"></i> Report Disaster
        </button>`;

    // Fetch data in parallel
    const [reports, trips] = await Promise.all([
        fetchUserReports(),
        fetchUserTrips()
    ]);

    allReports = reports;
    allTrips   = trips;

    renderUserStats();
    renderUserContent();
}

function renderUserStats() {
    const pending   = allReports.filter(r => r.status === 'pending').length;
    const resolved  = allReports.filter(r => r.status === 'resolved').length;
    const trips     = allTrips.length;
    const upcoming  = allTrips.filter(t => t.status === 'planned').length;

    document.getElementById('statsRow').innerHTML = `
        ${statCard('fas fa-file-circle-exclamation', 'yellow', allReports.length, 'Total Reports')}
        ${statCard('fas fa-clock',                   'blue',   pending,            'Pending')}
        ${statCard('fas fa-circle-check',            'green',  resolved,           'Resolved')}
        ${statCard('fas fa-map-location-dot',        'purple', trips,              'Saved Trips')}
        ${statCard('fas fa-calendar-check',          'blue',   upcoming,           'Upcoming Trips')}
    `;
}

function renderUserContent() {
    document.getElementById('contentArea').innerHTML = `
        <!-- My Reports -->
        <div>
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-triangle-exclamation"></i> My Disaster Reports</h2>
                <button class="btn btn-primary btn-sm" onclick="openModal('reportModal')">
                    <i class="fas fa-plus"></i> New Report
                </button>
            </div>
            <div id="userReportsContainer">
                ${allReports.length ? buildReportCards(allReports, 'user') : emptyState('fas fa-file-circle-exclamation', 'No reports yet', 'Submit your first disaster report to help your community.')}
            </div>
        </div>

        <!-- My Trips -->
        <div>
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-map-location-dot"></i> My Saved Trips</h2>
                <a href="trip.html" class="btn btn-accent btn-sm">
                    <i class="fas fa-wand-magic-sparkles"></i> Plan New Trip
                </a>
            </div>
            <div id="userTripsContainer">
                ${allTrips.length ? buildTripCards(allTrips) : emptyState('fas fa-map-location-dot', 'No trips saved', 'Head over to the Trip Planner to create and save your first trip.')}
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════
//  ██████  ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════
async function renderAdminDashboard() {
    document.getElementById('dashTitle').textContent    = 'Admin Control Panel';
    document.getElementById('dashSubtitle').textContent = 'Review all disaster reports and manage trip records';

    document.getElementById('headerAction').innerHTML = `
        <div class="filters-bar">
            <select class="filter-select" id="adminStatusFilter" onchange="filterAdminReports()">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
            </select>
            <select class="filter-select" id="adminSevFilter" onchange="filterAdminReports()">
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
            </select>
            <input class="filter-input" id="adminLocFilter" type="text" placeholder="Filter by location..." oninput="filterAdminReports()" />
        </div>`;

    const [reports, trips] = await Promise.all([
        fetchAllReports(),
        fetchAllTrips()
    ]);

    allReports = reports.reports || [];
    reportStats = reports.stats || {};
    allTrips   = trips;

    renderAdminStats();
    renderAdminContent();
}

function renderAdminStats() {
    const s = reportStats;
    document.getElementById('statsRow').innerHTML = `
        ${statCard('fas fa-file-lines',           'blue',   s.total     || 0, 'Total Reports')}
        ${statCard('fas fa-clock',                'yellow', s.pending   || 0, 'Pending')}
        ${statCard('fas fa-magnifying-glass',     'blue',   s.reviewing || 0, 'Reviewing')}
        ${statCard('fas fa-circle-check',         'green',  s.resolved  || 0, 'Resolved')}
        ${statCard('fas fa-circle-xmark',         'red',    s.rejected  || 0, 'Rejected')}
        ${statCard('fas fa-map-location-dot',     'purple', allTrips.length, 'Total Trips')}
    `;
}

function renderAdminContent() {
    document.getElementById('contentArea').innerHTML = `
        <!-- All Reports Table -->
        <div>
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-file-lines"></i> All Disaster Reports</h2>
                <span class="badge badge-pending" id="reportCountBadge">${allReports.length} reports</span>
            </div>
            <div class="table-card">
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Type</th>
                                <th>Severity</th>
                                <th>Location</th>
                                <th>Reported By</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="adminReportsTableBody">
                            ${buildAdminReportsRows(allReports)}
                        </tbody>
                    </table>
                </div>
                ${allReports.length === 0 ? emptyState('fas fa-file-circle-exclamation', 'No reports found', 'No disaster reports have been submitted yet.') : ''}
            </div>
        </div>

        <!-- All Trips Table -->
        <div>
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-map-location-dot"></i> All User Trips</h2>
                <span class="badge badge-planned">${allTrips.length} trips</span>
            </div>
            <div class="table-card">
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Trip Name</th>
                                <th>Route</th>
                                <th>Duration</th>
                                <th>Travellers</th>
                                <th>Status</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody id="adminTripsTableBody">
                            ${buildAdminTripsRows(allTrips)}
                        </tbody>
                    </table>
                </div>
                ${allTrips.length === 0 ? emptyState('fas fa-map-location-dot', 'No trips found', 'No trips have been saved by users yet.') : ''}
            </div>
        </div>
    `;
}

function filterAdminReports() {
    const status   = document.getElementById('adminStatusFilter')?.value || '';
    const severity = document.getElementById('adminSevFilter')?.value || '';
    const location = (document.getElementById('adminLocFilter')?.value || '').toLowerCase();

    const filtered = allReports.filter(r => {
        const matchStatus   = !status   || r.status   === status;
        const matchSeverity = !severity || r.severity === severity;
        const matchLoc      = !location || r.location.toLowerCase().includes(location);
        return matchStatus && matchSeverity && matchLoc;
    });

    const tbody = document.getElementById('adminReportsTableBody');
    if (tbody) tbody.innerHTML = buildAdminReportsRows(filtered);
    const badge = document.getElementById('reportCountBadge');
    if (badge) badge.textContent = `${filtered.length} reports`;
}

// ═══════════════════════════════════════════════════════
//  CARD / ROW BUILDERS
// ═══════════════════════════════════════════════════════
function buildReportCards(reports, viewAs) {
    return `<div class="cards-grid">${reports.map(r => reportCard(r, viewAs)).join('')}</div>`;
}

function reportCard(r, viewAs) {
    const icon = disasterIcon(r.disaster_type);
    const date = formatDate(r.created_at);
    const isAdmin = viewAs === 'admin';
    return `
    <div class="report-card ${r.status}" id="rc-${r.id}">
        <div class="card-top">
            <div class="card-type-icon">${icon}</div>
            <div style="flex:1">
                <div class="card-title">${capitalize(r.disaster_type)} Disaster</div>
                <div class="card-subtitle"><i class="fas fa-location-dot"></i> ${r.location}</div>
            </div>
            <span class="badge badge-${r.status}">${statusLabel(r.status)}</span>
        </div>
        <p class="card-desc">${r.description}</p>
        <div class="card-meta">
            <span class="sev-${r.severity}"><i class="fas fa-circle-exclamation"></i> ${capitalize(r.severity)}</span>
            <span><i class="fas fa-calendar"></i> ${date}</span>
            ${isAdmin ? `<span><i class="fas fa-user"></i> ${r.user_name || 'Unknown'}</span>` : ''}
        </div>
        ${r.admin_notes ? `<div class="admin-notes-box"><strong>Admin:</strong> ${r.admin_notes}</div>` : ''}
        <div class="card-actions">
            <button class="btn btn-ghost btn-sm" onclick="viewReport(${r.id})"><i class="fas fa-eye"></i> View</button>
            ${isAdmin ? `<button class="btn btn-warning btn-sm" onclick="openUpdateReport(${r.id})"><i class="fas fa-pen"></i> Update Status</button>` : ''}
            ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteReport(${r.id})"><i class="fas fa-trash"></i></button>` : ''}
        </div>
    </div>`;
}

function buildTripCards(trips) {
    return `<div class="cards-grid">${trips.map(tripCard).join('')}</div>`;
}

function tripCard(t) {
    const days = daysBetween(t.start_date, t.end_date);
    return `
    <div class="trip-card" id="tc-${t.id}">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--primary),var(--accent))"></div>
        <div class="card-top">
            <div class="card-type-icon">✈️</div>
            <div style="flex:1">
                <div class="card-title">${t.trip_name}</div>
                <div class="card-subtitle"><i class="fas fa-arrow-right"></i> ${t.destination_location}</div>
            </div>
            <span class="badge badge-${t.status}">${capitalize(t.status)}</span>
        </div>
        <div class="card-meta">
            <span><i class="fas fa-calendar"></i> ${formatDate(t.start_date)}</span>
            <span><i class="fas fa-moon"></i> ${days} day${days !== 1 ? 's' : ''}</span>
            <span><i class="fas fa-${modeIcon(t.travel_mode)}"></i> ${capitalize(t.travel_mode || 'car')}</span>
            <span><i class="fas fa-wallet"></i> ${capitalize(t.budget_level || 'medium')}</span>
        </div>
        ${t.notes ? `<div class="admin-notes-box" style="border-color:rgba(59,130,246,0.3);background:rgba(59,130,246,0.06)"><strong style="color:var(--primary-light)">📝 Notes:</strong> ${t.notes}</div>` : ''}
        <div class="card-actions" style="margin-top:12px">
            <button class="btn btn-ghost btn-sm" onclick="openEditTrip(${t.id})"><i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-success btn-sm" onclick="openAddUpdate(${t.id})"><i class="fas fa-plus"></i> Add Note</button>
            <button class="btn btn-accent btn-sm" onclick="viewTripUpdates(${t.id})"><i class="fas fa-clock-rotate-left"></i> Log</button>
        </div>
    </div>`;
}

function buildAdminReportsRows(reports) {
    if (!reports.length) return `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">No reports found</td></tr>`;
    return reports.map(r => `
        <tr>
            <td style="color:var(--text-muted)">#${r.id}</td>
            <td>${disasterIcon(r.disaster_type)} ${capitalize(r.disaster_type)}</td>
            <td><span class="sev-${r.severity}">● ${capitalize(r.severity)}</span></td>
            <td>${r.location}</td>
            <td>${r.user_name || '—'}</td>
            <td><span class="badge badge-${r.status}">${statusLabel(r.status)}</span></td>
            <td style="color:var(--text-secondary)">${formatDate(r.created_at)}</td>
            <td>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="viewReport(${r.id})" title="View"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-warning btn-sm" onclick="openUpdateReport(${r.id})" title="Update"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteReport(${r.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`).join('');
}

function buildAdminTripsRows(trips) {
    if (!trips.length) return `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">No trips found</td></tr>`;
    return trips.map(t => `
        <tr>
            <td style="color:var(--text-muted)">#${t.id}</td>
            <td style="font-weight:600">${t.trip_name}</td>
            <td style="color:var(--text-secondary)">${t.source_location} → ${t.destination_location}</td>
            <td>${daysBetween(t.start_date, t.end_date)} days</td>
            <td>${t.traveller_count || 1} pax</td>
            <td><span class="badge badge-${t.status}">${capitalize(t.status)}</span></td>
            <td style="color:var(--text-secondary)">${formatDate(t.created_at)}</td>
        </tr>`).join('');
}

// ═══════════════════════════════════════════════════════
//  API — REPORTS
// ═══════════════════════════════════════════════════════
async function fetchUserReports() {
    try {
        const d = await authFetch(`${API}/reports/user/${currentUser.id}`);
        return d.success ? d.reports : [];
    } catch { return []; }
}

async function fetchAllReports() {
    try {
        const d = await authFetch(`${API}/reports`);
        return d;
    } catch { return { reports: [], stats: {} }; }
}

async function submitReport() {
    const btn = document.getElementById('submitReportBtn');
    const type = document.getElementById('rDisasterType').value;
    const sev  = document.getElementById('rSeverity').value;
    const loc  = document.getElementById('rLocation').value.trim();
    const desc = document.getElementById('rDescription').value.trim();

    if (!type || !sev || !loc || !desc) {
        showFormMsg('reportFormMsg', 'Please fill in all required fields.', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const data = await authFetch(`${API}/reports`, {
            method: 'POST',
            body: JSON.stringify({
                user_id: currentUser.id,
                disaster_type: type,
                severity: sev,
                location: loc,
                latitude: parseFloat(document.getElementById('rLat').value) || null,
                longitude: parseFloat(document.getElementById('rLng').value) || null,
                description: desc
            })
        });

        if (data.success) {
            closeModal('reportModal');
            clearReportForm();
            toast('Report submitted successfully! ✅', 'success');
            // Refresh
            allReports = await fetchUserReports();
            renderUserStats();
            document.getElementById('userReportsContainer').innerHTML =
                allReports.length ? buildReportCards(allReports, 'user') :
                emptyState('fas fa-file-circle-exclamation', 'No reports yet', 'Submit your first disaster report.');
        } else {
            showFormMsg('reportFormMsg', data.message || 'Submission failed', 'error');
        }
    } catch {
        showFormMsg('reportFormMsg', 'Network error. Is the server running?', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Report';
}

async function viewReport(id) {
    const r = allReports.find(x => x.id === id);
    if (!r) return;
    document.getElementById('reportDetailBody').innerHTML = `
        <div style="display:grid;gap:14px">
            <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:32px">${disasterIcon(r.disaster_type)}</span>
                <div>
                    <div style="font-size:18px;font-weight:700">${capitalize(r.disaster_type)} Disaster</div>
                    <div style="color:var(--text-secondary);font-size:13px">${r.location} • ${formatDate(r.created_at)}</div>
                </div>
                <span class="badge badge-${r.status}" style="margin-left:auto">${statusLabel(r.status)}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <div style="background:var(--glass);border:1px solid var(--glass-border);border-radius:10px;padding:12px">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Severity</div>
                    <div class="sev-${r.severity}" style="font-weight:700;font-size:15px">● ${capitalize(r.severity)}</div>
                </div>
                <div style="background:var(--glass);border:1px solid var(--glass-border);border-radius:10px;padding:12px">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Submitted By</div>
                    <div style="font-weight:600;font-size:14px">${r.user_name || currentUser.full_name}</div>
                </div>
            </div>
            <div style="background:var(--glass);border:1px solid var(--glass-border);border-radius:10px;padding:14px">
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Description</div>
                <p style="font-size:14px;line-height:1.7;color:var(--text-primary)">${r.description}</p>
            </div>
            ${r.admin_notes ? `
            <div style="background:var(--purple-bg);border:1px solid rgba(139,92,246,0.25);border-radius:10px;padding:14px">
                <div style="font-size:11px;color:var(--purple);text-transform:uppercase;margin-bottom:6px">Admin Notes</div>
                <p style="font-size:14px;color:var(--text-primary)">${r.admin_notes}</p>
                ${r.admin_name ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px">— ${r.admin_name}</div>` : ''}
            </div>` : ''}
        </div>`;
    openModal('reportDetailModal');
}

function openUpdateReport(id) {
    const r = allReports.find(x => x.id === id);
    if (!r) return;
    document.getElementById('updateReportId').value = id;
    document.getElementById('updateStatus').value   = r.status;
    document.getElementById('updateNotes').value    = r.admin_notes || '';
    openModal('updateReportModal');
}

async function saveReportStatus() {
    const id     = document.getElementById('updateReportId').value;
    const status = document.getElementById('updateStatus').value;
    const notes  = document.getElementById('updateNotes').value.trim();

    try {
        const res = await fetch(`${API}/reports/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, admin_notes: notes, admin_id: currentUser.id })
        });
        const d = await res.json();
        if (d.success) {
            closeModal('updateReportModal');
            toast(`Report marked as "${capitalize(status)}" ✅`, 'success');
            // Refresh admin
            const fresh = await fetchAllReports();
            allReports  = fresh.reports || [];
            reportStats = fresh.stats   || {};
            renderAdminStats();
            document.getElementById('adminReportsTableBody').innerHTML = buildAdminReportsRows(allReports);
        } else {
            toast(d.message || 'Update failed', 'error');
        }
    } catch {
        toast('Network error', 'error');
    }
}

async function deleteReport(id) {
    if (!confirm('Delete this report permanently?')) return;
    try {
        const res = await fetch(`${API}/reports/${id}`, { method: 'DELETE' });
        const d = await res.json();
        if (d.success) {
            allReports = allReports.filter(r => r.id !== id);
            toast('Report deleted', 'success');
            if (currentUser.role === 'admin') {
                document.getElementById('adminReportsTableBody').innerHTML = buildAdminReportsRows(allReports);
                reportStats.total = (reportStats.total || 1) - 1;
                renderAdminStats();
            } else {
                renderUserStats();
                document.getElementById('userReportsContainer').innerHTML =
                    allReports.length ? buildReportCards(allReports, 'user') :
                    emptyState('fas fa-file-circle-exclamation', 'No reports yet', '');
            }
        } else toast(d.message || 'Delete failed', 'error');
    } catch { toast('Network error', 'error'); }
}

// ═══════════════════════════════════════════════════════
//  API — TRIPS
// ═══════════════════════════════════════════════════════
async function fetchUserTrips() {
    let trips = [];
    try {
        const d = await authFetch(`${API}/trips/user/${currentUser.id}`);
        if (d.success) trips = d.trips;
    } catch {
        // Fallback or ignore
    }
    try {
        const localTrips = JSON.parse(localStorage.getItem('skysafe_trips') || '[]');
        // Combine them, avoiding strict duplicates if possible, or just prepend local ones
        trips = [...localTrips, ...trips];
    } catch {
        // Ignore
    }
    return trips;
}

async function fetchAllTrips() {
    try {
        const d = await authFetch(`${API}/trips/all`);
        return d.success ? d.trips : [];
    } catch { return []; }
}

function openEditTrip(id) {
    const t = allTrips.find(x => x.id === id);
    if (!t) return;
    document.getElementById('editTripId').value   = id;
    document.getElementById('etName').value       = t.trip_name     || '';
    document.getElementById('etStart').value      = t.start_date?.slice(0, 10) || '';
    document.getElementById('etEnd').value        = t.end_date?.slice(0, 10)   || '';
    document.getElementById('etMode').value       = t.travel_mode   || 'car';
    document.getElementById('etStatus').value     = t.status        || 'planned';
    document.getElementById('etInterests').value  = t.interests     || '';
    document.getElementById('etNotes').value      = t.notes         || '';
    openModal('editTripModal');
}

async function saveTrip() {
    const id = document.getElementById('editTripId').value;
    const payload = {
        trip_name:    document.getElementById('etName').value.trim(),
        start_date:   document.getElementById('etStart').value,
        end_date:     document.getElementById('etEnd').value,
        travel_mode:  document.getElementById('etMode').value,
        status:       document.getElementById('etStatus').value,
        interests:    document.getElementById('etInterests').value.trim(),
        notes:        document.getElementById('etNotes').value.trim()
    };
    try {
        const res = await fetch(`${API}/trips/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const d = await res.json();
        if (d.success) {
            closeModal('editTripModal');
            toast('Trip updated successfully ✈️', 'success');
            allTrips = await fetchUserTrips();
            document.getElementById('userTripsContainer').innerHTML =
                allTrips.length ? buildTripCards(allTrips) :
                emptyState('fas fa-map-location-dot', 'No trips saved', '');
            renderUserStats();
        } else toast(d.message || 'Update failed', 'error');
    } catch { toast('Network error', 'error'); }
}

function openAddUpdate(tripId) {
    document.getElementById('updateTripId').value = tripId;
    document.getElementById('updateType').value   = 'note';
    document.getElementById('updateTitle').value  = '';
    document.getElementById('updateContent').value = '';
    openModal('addUpdateModal');
}

async function saveTripUpdate() {
    const tripId  = document.getElementById('updateTripId').value;
    const type    = document.getElementById('updateType').value;
    const title   = document.getElementById('updateTitle').value.trim();
    const content = document.getElementById('updateContent').value.trim();

    if (!content) { toast('Please enter some content', 'error'); return; }

    try {
        const res = await fetch(`${API}/trips/${tripId}/updates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, update_type: type, title, content })
        });
        const d = await res.json();
        if (d.success) {
            closeModal('addUpdateModal');
            toast('Update added to trip log 📝', 'success');
        } else toast(d.message || 'Failed to add update', 'error');
    } catch { toast('Network error', 'error'); }
}

async function viewTripUpdates(tripId) {
    document.getElementById('tripUpdatesBody').innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
    openModal('tripUpdatesModal');
    try {
        const res = await fetch(`${API}/trips/${tripId}/updates`);
        const d = await res.json();
        const updates = d.updates || [];
        if (!updates.length) {
            document.getElementById('tripUpdatesBody').innerHTML =
                emptyState('fas fa-clock-rotate-left', 'No updates yet', 'Add notes or changes to this trip.');
            return;
        }
        document.getElementById('tripUpdatesBody').innerHTML = `
            <div class="update-log">
                ${updates.map(u => `
                    <div class="update-item ${u.update_type}">
                        <div class="update-meta">
                            <span class="update-type-badge">${typeLabel(u.update_type)}</span>
                            ${u.title ? `<span style="font-weight:600;font-size:13px">${u.title}</span>` : ''}
                            <span class="update-time"><i class="fas fa-clock"></i> ${formatDate(u.created_at)}</span>
                        </div>
                        <div class="update-content">${u.content}</div>
                    </div>`).join('')}
            </div>
            <div style="margin-top:14px;text-align:right">
                <button class="btn btn-success btn-sm" onclick="closeModal('tripUpdatesModal');openAddUpdate(${tripId})"><i class="fas fa-plus"></i> Add Update</button>
            </div>`;
    } catch {
        document.getElementById('tripUpdatesBody').innerHTML = emptyState('fas fa-exclamation-triangle', 'Error loading updates', '');
    }
}

// ═══════════════════════════════════════════════════════
//  MODAL HELPERS
// ═══════════════════════════════════════════════════════
function openModal(id) {
    document.getElementById(id)?.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
    document.body.style.overflow = '';
}
// Close modal when clicking backdrop
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

function clearReportForm() {
    ['rDisasterType','rSeverity','rLocation','rLat','rLng','rDescription'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// ═══════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════
function toast(msg, type = 'info') {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => {
        el.style.animation = 'slideOut 0.3s forwards';
        setTimeout(() => el.remove(), 300);
    }, 3500);
}

function showFormMsg(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.color = type === 'error' ? 'var(--danger)' : 'var(--success)';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ═══════════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════════
function statCard(icon, color, value, label) {
    return `
    <div class="stat-card">
        <div class="stat-icon ${color}"><i class="${icon}"></i></div>
        <div class="stat-info">
            <div class="stat-value">${value}</div>
            <div class="stat-label">${label}</div>
        </div>
    </div>`;
}

function emptyState(icon, title, subtitle) {
    return `
    <div class="empty-state">
        <i class="${icon}"></i>
        <h4>${title}</h4>
        <p>${subtitle}</p>
    </div>`;
}

function disasterIcon(type) {
    const icons = {
        flood: '🌊', earthquake: '🌍', fire: '🔥', cyclone: '🌀',
        landslide: '⛰️', drought: '☀️', heatwave: '🌡️', tsunami: '🌊',
        chemical: '☢️', other: '⚠️'
    };
    return icons[type] || '⚠️';
}

function statusLabel(s) {
    const labels = { pending: '⏳ Pending', reviewing: '🔍 Reviewing', resolved: '✅ Resolved', rejected: '❌ Rejected' };
    return labels[s] || s;
}

function typeLabel(t) {
    const l = { note: '📝 Note', change: '✏️ Change', add_activity: '🎯 Activity', status_change: '🔄 Status' };
    return l[t] || t;
}

function modeIcon(mode) {
    const map = { car: 'car', bus: 'bus', train: 'train', flight: 'plane', bike: 'motorcycle' };
    return map[mode] || 'car';
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysBetween(a, b) {
    const ms = new Date(b) - new Date(a);
    return Math.max(1, Math.round(ms / 86400000) + 1);
}
