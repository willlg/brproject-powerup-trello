window.BRProjectHelpers = {
  formatTime(minutes) {
    if (!minutes || isNaN(minutes)) return '0h 0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  },

  async loadComponent(componentPath) {
    try {
      const response = await fetch(componentPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      console.error('Erro ao carregar componente:', error);
      throw error;
    }
  },

  checkDependencies(dependencies) {
    const missing = dependencies.filter(dep => {
      const obj = dep.obj || window[dep.name];
      return !obj;
    });
    
    if (missing.length > 0) {
      console.error('Dependências faltando:', missing.map(d => d.name));
      return false;
    }
    
    return true;
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  generateAuthHash(email, password) {
    if (!window.CryptoJS) {
      throw new Error('CryptoJS não está disponível');
    }
    
    const emailHash = CryptoJS.MD5(email).toString();
    const passwordHash = CryptoJS.MD5(password).toString();
    return CryptoJS.MD5(emailHash + passwordHash).toString();
  },

  sanitizeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};