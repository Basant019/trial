# SkySafe UI Theme - Implementation Guide

## 📋 Overview

This guide covers the complete light/dark mode theme system for SkySafe. The system is built on CSS custom properties (variables) that automatically switch between light and dark modes.

---

## 🎨 Theme Files Created

### 1. **global.css** (Frontend Core Theme)
Located: `frontend/css/global.css`

This file contains:
- **CSS Variables**: All theme colors, spacing, sizing, and transitions
- **Base Styles**: Reset, typography, buttons, forms, cards, alerts
- **Theme Toggle Button**: Styled `.theme-toggle` button
- **Responsive Design**: Mobile-first breakpoints
- **Accessibility**: WCAG AA compliant contrast ratios

### 2. **theme.js** (Theme Manager)
Located: `frontend/js/theme.js`

This file contains:
- **Theme Initialization**: Loads saved theme preference from localStorage
- **Toggle Function**: Switches between light and dark modes
- **Persistence**: Saves theme choice to localStorage
- **Event Dispatch**: Fires custom `themechange` event for other scripts

---

## 🌗 Light & Dark Mode

### Light Mode (Default)
- **Background**: Soft white (`#f8fafc`)
- **Text**: Dark slate (`#1e293b`)
- **Primary**: Blue (`#3b82f6`)
- **Secondary**: Green (`#10b981`)
- **Accent (Alerts)**: Orange (`#f59e0b`)
- **Eye Strain**: Minimal - soft grays, good contrast

### Dark Mode (Soft Dark)
- **Background**: Dark blue-gray (`#0f172a`)
- **Surface**: Slate (`#1e293b`)
- **Text**: Soft white (`#f1f5f9`)
- **Primary**: Light blue (`#60a5fa`)
- **Secondary**: Light green (`#34d399`)
- **Accent (Alerts)**: Light orange (`#fbbf24`)
- **Eye Strain**: Reduced - no pure black/white

---

## 🔧 Implementation Steps

### Step 1: Update HTML Files

Add these links to the `<head>` of each HTML page:

```html
<!-- Import Global Theme CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
<link rel="stylesheet" href="../css/global.css" />
<link rel="stylesheet" href="../css/auth.css" />
<!-- Other page-specific CSS files -->
```

Add this script at the end of `<body>`:

```html
<script src="../js/theme.js"></script>
```

### Step 2: Add Theme Toggle Button to Navbar

Add this button to your navbar/header:

```html
<button class="theme-toggle" id="themeToggle" title="Toggle Theme" aria-label="Toggle theme">
  <i class="fas fa-sun" style="display: none;"></i>
  <i class="fas fa-moon"></i>
</button>
```

**How it works:**
- Light mode → Shows 🌙 icon (click to switch to dark)
- Dark mode → Shows ☀️ icon (click to switch to light)
- Clicking toggles the theme and saves preference

### Step 3: Set Data Theme on HTML Element

Ensure your HTML element has the data-theme attribute:

```html
<html lang="en" data-theme="light">
```

The JavaScript will automatically:
1. Check localStorage for saved theme
2. Apply saved theme on page load
3. Update this attribute when theme is toggled

---

## 🎯 Using CSS Variables in Your Styles

Replace all hardcoded colors with CSS variables. Here's how:

**Before (Hardcoded):**
```css
.my-button {
  background: #3b82f6;
  color: #ffffff;
  border: 1px solid #e2e8f0;
}
```

**After (With Variables):**
```css
.my-button {
  background: var(--primary);
  color: white;
  border: 1px solid var(--border);
  transition: var(--transition);
}

.my-button:hover {
  background: var(--primary-dark);
}

.my-button:active {
  transform: scale(0.98);
}
```

---

## 📚 Available CSS Variables

### Colors

#### Primary (Weather/Trip Theme)
- `--primary`: Main blue (#3b82f6 light, #60a5fa dark)
- `--primary-light`: Light blue (#dbeafe light, #1e3a8a dark)
- `--primary-dark`: Dark blue (#1e40af light, #bfdbfe dark)
- `--primary-glow`: Blue glow effect for shadows

#### Secondary (Trip/General Theme)
- `--secondary`: Green (#10b981 light, #34d399 dark)
- `--secondary-light`: Light green (#d1fae5 light, #064e3b dark)

#### Accent (Disaster/Alert Theme)
- `--accent`: Orange (#f59e0b light, #fbbf24 dark)
- `--accent-light`: Light orange (#fed7aa light, #78350f dark)

#### Status Colors
- `--danger`: Red (#ef4444 light, #f87171 dark)
- `--danger-light`: Light red (#fee2e2 light, #7f1d1d dark)
- `--danger-bg`: Red background tint

- `--success`: Green (#10b981 light, #34d399 dark)
- `--success-light`: Light green (#d1fae5 light, #064e3b dark)
- `--success-bg`: Green background tint

- `--warning`: Orange (#f59e0b light, #fbbf24 dark)
- `--warning-light`: Light orange (#fed7aa light, #78350f dark)
- `--warning-bg`: Orange background tint

### Backgrounds & Surfaces
- `--bg-primary`: Page background (#f8fafc light, #0f172a dark)
- `--bg-secondary`: Secondary background (#f1f5f9 light, #1a202c dark)
- `--surface-primary`: Card/surface background (#ffffff light, #1e293b dark)
- `--surface-secondary`: Alternative surface (#f8fafc light, #293548 dark)
- `--bg-card`: Card background (same as surface-primary)

### Text
- `--text-primary`: Main text (#1e293b light, #f1f5f9 dark)
- `--text-secondary`: Secondary text (#64748b light, #cbd5e1 dark)
- `--text-tertiary`: Tertiary text (#94a3b8 light, #94a3b8 dark)
- `--text-muted`: Muted text (#94a3b8)

### Borders
- `--border`: Standard border (#e2e8f0 light, #334155 dark)
- `--border-light`: Light border (#f1f5f9 light, #475569 dark)

### Form Inputs
- `--input-bg`: Input background (#ffffff light, #293548 dark)
- `--input-bg-focus`: Input focus background (#f8fafc light, #1e293b dark)
- `--input-border`: Input border (#e2e8f0 light, #475569 dark)

### Shadows
- `--shadow-sm`: Small shadow
- `--shadow-md`: Medium shadow
- `--shadow-lg`: Large shadow

### Spacing & Sizing
- `--radius-sm`: Small border radius (6px)
- `--radius-md`: Medium border radius (8px)
- `--radius-lg`: Large border radius (12px)
- `--radius-xl`: Extra large border radius (16px)

### Transitions
- `--transition`: Smooth transition (0.3s cubic-bezier)

### Fonts
- `--font-primary`: 'Poppins' (headings)
- `--font-secondary`: 'Inter' (body)

---

## 🎨 Feature-Based Color Theming

### Weather Forecast Section
Use: `--primary` (blue), `--secondary` (green)
```css
.weather-card {
  background: var(--surface-primary);
  border-left: 4px solid var(--primary);
  color: var(--text-primary);
}

.weather-icon {
  color: var(--primary);
}
```

### Disaster Management Section
Use: `--accent` (orange), `--danger` (red)
```css
.alert-card {
  background: var(--surface-primary);
  border-left: 4px solid var(--danger);
  color: var(--text-primary);
}

.alert-badge {
  background: var(--danger-bg);
  color: var(--danger);
}
```

### Trip Planner Section
Use: `--secondary` (green), `--primary` (blue)
```css
.trip-card {
  background: var(--surface-primary);
  border: 1px solid var(--secondary);
  color: var(--text-primary);
}

.trip-button {
  background: var(--secondary);
  color: white;
}
```

---

## 💡 Component Examples

### Button
```html
<button class="btn btn-primary">Click Me</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-danger">Delete</button>
<button class="btn btn-success">Confirm</button>
```

### Form Input
```html
<div class="form-group">
  <label class="form-label" for="email">Email</label>
  <input id="email" type="email" class="form-input" placeholder="you@example.com" />
</div>
```

### Card
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
  </div>
  <div class="card-body">
    Content goes here...
  </div>
  <div class="card-footer">
    <button class="btn btn-primary">Action</button>
  </div>
</div>
```

### Alert
```html
<div class="alert alert-success">
  <i class="fas fa-check-circle"></i>
  <span>Success! Your action was completed.</span>
</div>

<div class="alert alert-danger">
  <i class="fas fa-exclamation-circle"></i>
  <span>Error! Something went wrong.</span>
</div>
```

### Badge
```html
<span class="badge">Default</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-danger">Danger</span>
```

---

## 🔊 Listening to Theme Changes

You can listen for theme changes in JavaScript:

```javascript
// Listen for theme changes
window.addEventListener('themechange', (e) => {
  const theme = e.detail.theme;
  console.log('Theme changed to:', theme);
  
  // Update any third-party libraries or custom logic
  // For example, update charts, maps, etc.
});

// Check current theme
const currentTheme = themeManager.getCurrent();
console.log('Current theme:', currentTheme);

// Programmatically set theme
themeManager.set('dark'); // or 'light'
```

---

## 📱 Responsive Design

The theme automatically adapts to screen sizes:

- **Desktop (>768px)**: Full layouts with proper spacing
- **Tablet (480px-768px)**: Adjusted spacing and font sizes
- **Mobile (<480px)**: Optimized for touch, single column layouts

All components maintain readability and usability across all screen sizes.

---

## ♿ Accessibility

The theme system ensures:
- **Contrast**: WCAG AA compliant (4.5:1 ratio for text)
- **Focus States**: Clear focus indicators on interactive elements
- **Semantic HTML**: Proper heading hierarchy (h1 → h6)
- **Font**: Readable sans-serif fonts (Poppins, Inter)
- **Motion**: Reduced animations for users with motion sensitivity
- **Icons**: Proper aria-labels on icon buttons

---

## 📝 Example: Converting a Page

### Original Page (No Theme System)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #f8fafc; color: #1e293b; }
    .card { background: white; border: 1px solid #e2e8f0; }
    .btn { background: #3b82f6; color: white; }
  </style>
</head>
<body>
  <div class="card">
    <button class="btn">Click Me</button>
  </div>
</body>
</html>
```

### Updated Page (With Theme System)
```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
  <link rel="stylesheet" href="../css/global.css" />
  <style>
    body { background: var(--bg-primary); color: var(--text-primary); }
    .card { background: var(--surface-primary); border: 1px solid var(--border); }
    .btn { background: var(--primary); color: white; }
  </style>
</head>
<body>
  <button class="theme-toggle" id="themeToggle">
    <i class="fas fa-sun" style="display: none;"></i>
    <i class="fas fa-moon"></i>
  </button>

  <div class="card">
    <button class="btn">Click Me</button>
  </div>

  <script src="../js/theme.js"></script>
</body>
</html>
```

---

## 🚀 Quick Checklist

- [ ] Copy `global.css` to `frontend/css/`
- [ ] Copy `theme.js` to `frontend/js/`
- [ ] Update `login.html` with theme files
- [ ] Add theme toggle button to navbar
- [ ] Set `data-theme="light"` on `<html>`
- [ ] Convert hardcoded colors to CSS variables in all CSS files
- [ ] Test light mode
- [ ] Test dark mode
- [ ] Test on mobile devices
- [ ] Test with keyboard navigation
- [ ] Verify localStorage persistence

---

## 🎯 Next Steps

1. **Apply to All Pages**: Update `dashboard.html`, `forecast.html`, `trip.html`, `alert.html`, etc.
2. **Update Page-Specific CSS**: Convert `dashboard.css`, `forecast.css`, etc. to use variables
3. **Add Navbar**: Create a consistent navbar component with theme toggle
4. **Test Third-Party Libraries**: Ensure charts, maps, etc. work with theme changes
5. **User Feedback**: Collect feedback on theme and colors

---

## 📞 Support

For issues or questions about the theme system:
1. Check console for any JavaScript errors
2. Verify localStorage is enabled
3. Clear browser cache and reload
4. Ensure all CSS variables are properly defined

---

## Version
SkySafe UI Theme System v1.0
Created: April 23, 2026
