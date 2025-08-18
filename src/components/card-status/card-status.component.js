class CardStatusComponent {
  constructor() {
    this.t = null;
    this.cardId = null;
    this.brprojectService = null;
    this.trelloService = null;
    this.taskData = null;
    this.isInitialized = false;
    this.retryAttempts = 0;
    this.maxRetries = 3;
  }

  async initialize() {
    console.log('[CardStatus] Iniciando componente...');
    
    try {
      this.t = window.TrelloPowerUp.iframe();
      this.brprojectService = window.BRProjectService;
      this.trelloService = new TrelloService(this.t);
      
      await this.t.render(() => this.initializeApp());
    } catch (error) {
      console.error('[CardStatus] Erro ao inicializar:', error);
      this.retryInitialization();
    }
  }

  retryInitialization() {
    if (this.retryAttempts < this.maxRetries) {
      this.retryAttempts++;
      console.log(`[CardStatus] Tentativa ${this.retryAttempts} de ${this.maxRetries}`);
      setTimeout(() => this.initializeApp(), 1000 * this.retryAttempts);
    } else {
      this.showError('Erro ao carregar componente');
    }
  }

  async initializeApp() {
    console.log('[CardStatus] Inicializando app...');
    
    try {
      if (!this.checkDependencies()) {
        this.retryInitialization();
        return;
      }

      await this.loadBasicData();
      
      if (!this.cardId) {
        this.showError('Card não identificado');
        return;
      }

      const { token, url } = await this.trelloService.getUserData();
      const isLoggedIn = !!(token && url);
      
      if (!isLoggedIn) {
        this.showError('Não conectado');
        return;
      }
      
      this.brprojectService.token = token;
      this.brprojectService.url = url;

      await this.loadTaskState();
      
      await this.loadTaskInfo();

      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('[CardStatus] Componente inicializado com sucesso');
      
    } catch (error) {
      console.error('[CardStatus] Erro no initializeApp:', error);
      this.showError('Erro ao carregar');
    }
  }

  checkDependencies() {
    const dependencies = [
      'TrelloPowerUp',
      'BRProjectService', 
      'BRPROJECT_CONFIG',
      'BRProjectHelpers'
    ];

    return dependencies.every(dep => {
      if (!window[dep]) {
        console.error(`[CardStatus] Dependência faltando: ${dep}`);
        return false;
      }
      return true;
    });
  }

  async loadBasicData() {
    try {
      this.cardId = await this.trelloService.getCardId();
      console.log('[CardStatus] Card ID:', this.cardId);
    } catch (error) {
      console.error('[CardStatus] Erro ao carregar dados básicos:', error);
      throw error;
    }
  }

  async loadTaskState() {
    if (!this.brprojectService.isAuthenticated()) {
      return;
    }

    try {
      const data = await this.brprojectService.getLastTask();
      
      const isRunning = !!(
        data?.success && 
        data?.data?.atividade &&
        data.data.atividade.finalizada != 1 && 
        data.data.atividade.tarefa &&
        data.data.atividade.tarefa.referencia_id == this.cardId
      );

      this.taskData = data;
      this.renderButton(isRunning);
      
    } catch (error) {
      console.error('[CardStatus] Erro ao verificar estado da tarefa:', error);
      this.renderButton(false);
    }
  }

  async loadTaskInfo() {
    if (!this.cardId || !this.brprojectService.isAuthenticated()) {
      this.setDefaultTaskInfo();
      return;
    }
    
    try {
      console.log('[CardStatus] Buscando informações da tarefa...');
      
      const data = await this.brprojectService.getTaskByReference(this.cardId);
      this.processTaskData(data);
      
    } catch (error) {
      console.error('[CardStatus] Erro ao buscar informações da tarefa:', error);
      this.setDefaultTaskInfo();
    }
  }

  processTaskData(data) {
    const clienteElement = document.getElementById('cliente-nome');
    const projetoElement = document.getElementById('projeto-nome');
    const editButtonElement = document.getElementById('edit-button');
    const dashboardButtonElement = document.getElementById('dashboard-button');
    const noLinksMessageElement = document.getElementById('no-links-message');
    
    if (data?.success && data?.data?.tarefa) {
      const tarefa = data.data.tarefa;
      
      const clienteNome = tarefa.cliente?.nome || 'Não informado';
      const projetoNome = tarefa.projeto?.nome || 'Não informado';
      
      clienteElement.textContent = clienteNome;
      projetoElement.textContent = projetoNome;
      
      if (tarefa.idtarefa) {
        const baseUrl = 'https://www2.projetos.brsis.com.br/brproject';
        editButtonElement.href = `${baseUrl}/tarefa/update/${tarefa.idtarefa}`;
        editButtonElement.style.display = 'inline-flex';
        
        dashboardButtonElement.href = `${baseUrl}/tarefa/${tarefa.idtarefa}`;
        dashboardButtonElement.style.display = 'inline-flex';
        
        noLinksMessageElement.style.display = 'none';
      } else {
        this.hideTaskLinks();
      }
      
      console.log('[CardStatus] Informações atualizadas:', { clienteNome, projetoNome, idTarefa: tarefa.idtarefa });
    } else {
      this.setDefaultTaskInfo();
      this.hideTaskLinks();
    }
  }

  setDefaultTaskInfo() {
    const clienteElement = document.getElementById('cliente-nome');
    const projetoElement = document.getElementById('projeto-nome');
    
    if (clienteElement) clienteElement.textContent = 'Não informado';
    if (projetoElement) projetoElement.textContent = 'Não informado';
  }

  hideTaskLinks() {
    const editButtonElement = document.getElementById('edit-button');
    const dashboardButtonElement = document.getElementById('dashboard-button');
    const noLinksMessageElement = document.getElementById('no-links-message');
    
    if (editButtonElement) editButtonElement.style.display = 'none';
    if (dashboardButtonElement) dashboardButtonElement.style.display = 'none';
    if (noLinksMessageElement) noLinksMessageElement.style.display = 'flex';
  }

  renderButton(isRunning, isLoading = false) {
    const container = document.getElementById('brproject-status');
    if (!container) return;
    
    const loadingSpinner = isLoading ? '<span class="brproject-loading brproject-loading-small"></span>' : '';
    const disabledAttr = isLoading ? 'disabled' : '';
    
    if (isRunning) {
      container.innerHTML = `
        <button id="btn-stop" class="brproject-button brproject-button-stop brproject-button-small" ${disabledAttr}>
          ${loadingSpinner}Parar Tarefa
        </button>
      `;
    } else {
      container.innerHTML = `
        <button id="btn-start" class="brproject-button brproject-button-start brproject-button-small" ${disabledAttr}>
          ${loadingSpinner}Iniciar Tarefa
        </button>
      `;
    }
  }

  showError(message) {
    const container = document.getElementById('brproject-status');
    if (container) {
      container.innerHTML = `
        <button class="brproject-button brproject-button-secondary brproject-button-small" disabled>
          ${message}
        </button>
      `;
    }
  }

  async startTask() {
    if (!this.brprojectService.isAuthenticated() || !this.cardId) {
      return;
    }
    
    this.renderButton(false, true);
    
    try {
      const cardData = await this.trelloService.getCardData();
      const tarefaNome = cardData?.name || 'Tarefa sem nome';
      const tarefaDescricao = cardData?.desc || '';
      
      const tarefa = { 
        nome: tarefaNome,
        descricao: tarefaDescricao,
        referencia_id: this.cardId 
      };
      
      const result = await this.brprojectService.startTask(tarefa);
      
      if (result?.success) {
        this.renderButton(true);
        setTimeout(() => {
          this.loadTaskState();
          this.loadTaskInfo();
        }, 1000);
      } else {
        this.renderButton(false);
        console.error('[CardStatus] Erro ao iniciar tarefa:', result?.message);
      }
      
    } catch (error) {
      this.renderButton(false);
      console.error('[CardStatus] Erro ao iniciar tarefa:', error);
    }
  }

  async stopTask() {
    if (!this.brprojectService.isAuthenticated()) {
      return;
    }
    
    this.renderButton(true, true);
    
    try {
      const result = await this.brprojectService.stopTask();
      
      this.renderButton(false);
      
      setTimeout(() => {
        this.loadTaskState();
        this.loadTaskInfo();
      }, 1000);
      
    } catch (error) {
      this.renderButton(true);
      console.error('[CardStatus] Erro ao parar tarefa:', error);
    }
  }

  setupEventListeners() {
    document.addEventListener('click', (event) => {
      const target = event.target;
      
      if (target.id === 'btn-start') {
        event.preventDefault();
        this.startTask();
      }
      
      if (target.id === 'btn-stop') {
        event.preventDefault();
        this.stopTask();
      }
    });
  }
}

function initializeCardStatus() {
  const component = new CardStatusComponent();
  component.initialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCardStatus);
} else {
  initializeCardStatus();
}

window.CardStatusComponent = CardStatusComponent;