class BRProjectService {
  constructor() {
    this.url = "";
    this.token = "";
    this.timeout = window.BRPROJECT_CONFIG?.DEFAULT_TIMEOUT || 10000;
  }

  async generateToken(credentials) {
    if (!credentials.email || !credentials.password || !credentials.url) {
      throw new Error('Credenciais incompletas');
    }

    if (!BRProjectHelpers.isValidEmail(credentials.email)) {
      throw new Error('Email inválido');
    }

    if (!BRProjectHelpers.isValidUrl(credentials.url)) {
      throw new Error('URL inválida');
    }

    this.url = credentials.url;
    
    try {
      const key = BRProjectHelpers.generateAuthHash(credentials.email, credentials.password);
      const response = await this.request('token/gerar', 'GET', { chave: key });
      
      if (response.success && response.data?.token) {
        this.token = response.data.token;
      }
      
      return response;
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      throw error;
    }
  }

  async validateToken() {
    if (!this.token) {
      throw new Error('Token não disponível');
    }
    
    try {
      return await this.request('token/valido', 'GET', { token: this.token });
    } catch (error) {
      console.error('Erro ao validar token:', error);
      throw error;
    }
  }

  async getLastTask() {
    try {
      return await this.request('tarefa/ultima', 'GET');
    } catch (error) {
      console.error('Erro ao buscar última tarefa:', error);
      throw error;
    }
  }

  async getTaskByReference(referenceId) {
    if (!referenceId) {
      throw new Error('ID de referência é obrigatório');
    }
    
    try {
      return await this.request(`tarefa/referencia/${referenceId}`, 'GET');
    } catch (error) {
      console.error('Erro ao buscar tarefa por referência:', error);
      throw error;
    }
  }

  async startTask(task) {
    if (!task || !task.nome) {
      throw new Error('Dados da tarefa são obrigatórios');
    }
    
    try {
      return await this.request('tarefa/iniciar', 'POST', { tarefa: task });
    } catch (error) {
      console.error('Erro ao iniciar tarefa:', error);
      throw error;
    }
  }

  async stopTask() {
    try {
      return await this.request('tarefa/parar', 'POST');
    } catch (error) {
      console.error('Erro ao parar tarefa:', error);
      throw error;
    }
  }

  request(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      if (!this.url) {
        reject(new Error('URL do BRProject não configurada'));
        return;
      }

      const headers = {};
      if (this.token) {
        headers['Authorization'] = this.token;
      }

      const ajaxConfig = {
        url: `${this.url}/api/${endpoint}`,
        type: method,
        headers: headers,
        dataType: 'json',
        crossDomain: true,
        timeout: this.timeout,
        data: data,
        success: (response) => {
          resolve(response);
        },
        error: (xhr, status, error) => {
          const errorMessage = this.parseErrorResponse(xhr, status, error);
          reject(new Error(errorMessage));
        }
      };

      $.ajax(ajaxConfig);
    });
  }

  parseErrorResponse(xhr, status, error) {
    if (xhr.responseJSON && xhr.responseJSON.message) {
      return xhr.responseJSON.message;
    }
    
    switch (xhr.status) {
      case 401:
        return 'Não autorizado - verifique suas credenciais';
      case 403:
        return 'Acesso negado';
      case 404:
        return 'Endpoint não encontrado';
      case 500:
        return 'Erro interno do servidor';
      case 0:
        return 'Erro de conexão - verifique sua internet';
      default:
        return `Erro HTTP ${xhr.status}: ${error}`;
    }
  }

  clearSession() {
    this.token = "";
    this.url = "";
  }

  isAuthenticated() {
    return !!(this.token && this.url);
  }
}

window.BRProjectService = new BRProjectService();