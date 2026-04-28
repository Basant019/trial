/* ============================================================
   SkySafe Theme Toggle — Light/Dark Mode Management
   ============================================================ */

(function() {
  const THEME_KEY = 'skysafe-theme';
  const DEFAULT_THEME = 'light';
  
  /**
   * Initialize theme on page load
   */
  function initTheme() {
    // Check localStorage for saved theme
    const savedTheme = localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
    
    // Set theme on document
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update toggle button icon if it exists
    updateThemeToggleButton(savedTheme);
  }
  
  /**
   * Toggle between light and dark mode
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // Update DOM
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Save to localStorage
    localStorage.setItem(THEME_KEY, newTheme);
    
    // Update button
    updateThemeToggleButton(newTheme);
    
    // Dispatch custom event for other scripts to listen to
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
  }
  
  /**
   * Update theme toggle button icon
   */
  function updateThemeToggleButton(theme) {
    const toggleBtn = document.getElementById('themeToggle') || document.querySelector('.theme-toggle');
    
    if (!toggleBtn) return;
    
    const sunIcon = toggleBtn.querySelector('.fa-sun');
    const moonIcon = toggleBtn.querySelector('.fa-moon');
    
    if (theme === 'dark') {
      // Show sun icon (to switch back to light)
      if (sunIcon) sunIcon.style.display = 'inline-block';
      if (moonIcon) moonIcon.style.display = 'none';
    } else {
      // Show moon icon (to switch to dark)
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'inline-block';
    }
  }
  
  /**
   * Get current theme
   */
  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
  }
  
  /**
   * Set theme programmatically
   */
  function setTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(THEME_KEY, theme);
      updateThemeToggleButton(theme);
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
  
  // Set up event listener for toggle button
  document.addEventListener('click', function(e) {
    const toggleBtn = e.target.closest('.theme-toggle');
    if (toggleBtn) {
      toggleTheme();
    }
  });

  // Also bind direct button click if button exists
  const directBtn = document.getElementById('themeToggle') || document.querySelector('.theme-toggle');
  if (directBtn) {
    directBtn.addEventListener('click', function(e) {
      e.preventDefault();
      toggleTheme();
    });
  }
  
  // Expose functions to global scope
  window.themeManager = {
    toggle: toggleTheme,
    getCurrent: getCurrentTheme,
    set: setTheme
  };
})();
