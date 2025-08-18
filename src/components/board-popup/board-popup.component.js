class BoardPopupComponent {
  constructor() {
    this.t = null;
    this.boardId = null;
    this.boardData = null;
    this.brprojectService = null;
    this.trelloService = null;
    this.currentUser = null;
    this.isInitialized = false;
    this.retryAttempts = 0;
    this.maxRetries = 3;
  }

  async initialize() {
    console.log('[BoardPopup] Iniciando componente...');
    
    try {
      this.t = window.TrelloPowerUp.iframe();
      this.brprojectService = window.BRProjectService;
      this.trelloService = new TrelloService(this.t);
      
      await this.t.render(() => this.initializeApp());
    } catch (error) {
      console.error('[BoardPopup] Erro ao inicializar:', error);
      this.retryInitialization();
    }
  }

  retryInitialization() {
    if (this.retryAttempts < this.maxRetries) {
      this.retryAttempts++;
      console.log(`[BoardPopup] Tentativa ${this.retryAttempts} de ${this.maxRetries}`);
      setTimeout(() => this.initializeApp(), 1000 * this.retryAttempts);
    } else {
      this.showError('Erro ao carregar aplicação');
    }
  }

  async initializeApp() {
    console.log('[BoardPopup] Inicializando app...');
    
    try {
      if (!this.checkDependencies()) {
        this.retryInitialization();
        return;
      }

      await this.loadBasicData();
      
      const { token, url, user } = await this.trelloService.getUserData();
      const isLoggedIn = !!(token && url);
      
      if (isLoggedIn) {
        this.brprojectService.token = token;
        this.brprojectService.url = url;
        this.currentUser = user;
        
        await this.showDashboard();
      } else {
        this.showLoginForm();
      }

      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('[BoardPopup] Componente inicializado com sucesso');
      
    } catch (error) {
      console.error('[BoardPopup] Erro no initializeApp:', error);
      this.showError('Erro ao inicializar aplicação');
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
        console.error(`[BoardPopup] Dependência faltando: ${dep}`);
        return false;
      }
      return true;
    });
  }

  async loadBasicData() {
    try {
      this.boardId = await this.trelloService.getBoardId();
      this.boardData = await this.trelloService.getBoardData();
      
      console.log('[BoardPopup] Dados básicos carregados:', {
        boardId: this.boardId,
        boardName: this.boardData?.name
      });
    } catch (error) {
      console.error('[BoardPopup] Erro ao carregar dados básicos:', error);
    }
  }

  async showDashboard() {
    try {
      const taskData = await this.brprojectService.getLastTask();
      let runningTasks = [];
      
      if (taskData?.success && taskData?.data?.atividade && taskData.data.atividade.tarefa) {
        const activity = taskData.data.atividade;
        runningTasks = [{
          idtarefa: activity.tarefa.idtarefa,
          nome: activity.tarefa.nome,
          descricao: activity.tarefa.descricao,
          referencia_id: activity.tarefa.referencia_id,
          data_inicio: activity.data_inicio,
          rodando: (activity.finalizada != 1)
        }];
      }
      
      this.renderDashboard({
        logado: true,
        tarefasEmAndamento: runningTasks,
        usuario: this.currentUser,
        boardData: this.boardData,
        feedback: null
      });
      
    } catch (error) {
      console.error('[BoardPopup] Erro ao carregar dashboard:', error);
      this.renderDashboard({
        logado: true,
        tarefasEmAndamento: [],
        usuario: this.currentUser,
        boardData: this.boardData,
        feedback: { type: 'error', msg: 'Erro ao carregar tarefas' }
      });
    }
  }

  showLoginForm() {
    const root = document.getElementById('brproject-root');
    if (!root) return;

    root.innerHTML = `
      <div class="brproject-login-container">
        <form id="brproject-form-login" class="brproject-form">
          <div class="brproject-form-group">
            <label for="brproject-url">URL do BRProject</label>
            <input 
              id="brproject-url" 
              name="url" 
              value="https://www2.projetos.brsis.com.br/brproject" 
              type="url" 
              autocomplete="off"
              placeholder="https://exemplo.com.br/brproject"
              required
            />
          </div>
          <div class="brproject-form-group">
            <label for="brproject-email">E-mail</label>
            <input 
              id="brproject-email" 
              name="email" 
              type="email" 
              autocomplete="username"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div class="brproject-form-group">
            <label for="brproject-senha">Senha</label>
            <input 
              id="brproject-senha" 
              name="senha" 
              type="password" 
              autocomplete="current-password"
              placeholder="Sua senha"
              required
            />
          </div>
          <button class="brproject-button brproject-button-primary js-login-submit" type="submit">
            Entrar
          </button>
          <div class="brproject-login-error"></div>
        </form>
      </div>
    `;
  }

  renderDashboard({ logado, tarefasEmAndamento, usuario, boardData, feedback }) {
    console.log('[BoardPopup] Renderizando dashboard:', {
      logado,
      tasksCount: tarefasEmAndamento?.length,
      usuario: usuario?.email,
      boardName: boardData?.name
    });
    
    const root = document.getElementById('brproject-root');
    if (!root) return;
    
    let html = '';
    
    if (boardData) {
      html += `
        <div class="brproject-board-info">
          <strong>Board:</strong> 
          <div class="board-name">${BRProjectHelpers.sanitizeHtml(boardData.name || 'N/A')}</div>
        </div>
      `;
    }
    
    if (feedback) {
      html += `
        <div class="brproject-feedback brproject-feedback-${feedback.type}">
          ${BRProjectHelpers.sanitizeHtml(feedback.msg)}
        </div>
      `;
    }
    
    if (logado) {
      html += `
        <div class="brproject-user-info">
          <span class="user-email">${BRProjectHelpers.sanitizeHtml(usuario?.email || 'Usuário')}</span>
          <button id="btn-logout" class="brproject-button brproject-button-secondary brproject-button-small">
            Sair
          </button>
        </div>
      `;

      if (tarefasEmAndamento && tarefasEmAndamento.length > 0) {
        html += `<div class="brproject-running-tasks">
          <h4>Última Tarefa:</h4>`;
        
        tarefasEmAndamento.forEach(tarefa => {
          const isRunning = !!tarefa.rodando;
          const taskName = BRProjectHelpers.sanitizeHtml(tarefa.nome || 'Tarefa sem nome');
          const cardRef = BRProjectHelpers.sanitizeHtml(tarefa.referencia_id || 'N/A');
          const startTime = BRProjectHelpers.sanitizeHtml(tarefa.data_inicio || 'N/A');
          
          html += `
            <div class="brproject-running-task">
              <div class="task-info">
                <div class="task-name">${taskName}</div>
                <div class="task-card">Card: ${cardRef}</div>
                <div class="task-time">Iniciado: ${startTime}</div>
              </div>
              <div class="task-actions">
                ${isRunning 
                  ? `<button class="btn-parar-tarefa brproject-button brproject-button-danger" 
                             data-tarefa-id="${tarefa.idtarefa || ''}">
                       Parar
                     </button>`
                  : `<button class="btn-iniciar-tarefa brproject-button brproject-button-primary" 
                             data-tarefa-id="${tarefa.idtarefa || ''}" 
                             data-referencia-id="${tarefa.referencia_id || ''}" 
                             data-nome="${encodeURIComponent(tarefa.nome || '')}" 
                             data-descricao="${encodeURIComponent(tarefa.descricao || '')}">
                       Iniciar
                     </button>`
                }
              </div>
            </div>
          `;
        });
        
        html += `</div>`;
      } else {
        html += `
          <div class="brproject-no-tasks">
            Nenhuma tarefa encontrada.
          </div>
        `;
      }
    }
    
    root.innerHTML = html;
  }

  showLogoutConfirmation() {
    const root = document.getElementById('brproject-root');
    if (!root) return;

    const userEmail = this.currentUser?.email || 'Usuário';
    
    root.innerHTML = `
      <div class="brproject-logout-confirm">
        <div class="logout-message">
          Olá, <span class="user-email">${BRProjectHelpers.sanitizeHtml(userEmail)}</span>
        </div>
        <div class="logout-question">
          Tem certeza que deseja sair do BRProject?
        </div>
        <div class="actions">
          <button id="btn-logout-sim" class="brproject-button brproject-button-danger">
            Sim, sair
          </button>
          <button id="btn-logout-nao" class="brproject-button brproject-button-secondary">
            Cancelar
          </button>
        </div>
      </div>
    `;
  }

  async performLogout() {
    try {
      await this.trelloService.clearUserData();
      this.brprojectService.clearSession();
      this.currentUser = null;
      
      this.renderDashboard({
        logado: false,
        tarefasEmAndamento: [],
        usuario: null,
        boardData: null,
        feedback: { type: 'success', msg: 'Logout realizado com sucesso!' }
      });
      
      setTimeout(() => {
        this.showLoginForm();
      }, 2000);
      
    } catch (error) {
      console.error('[BoardPopup] Erro no logout:', error);
      this.showError('Erro ao realizar logout');
    }
  }

  async processLogin(credentials) {
    try {
      if (!BRProjectHelpers.isValidEmail(credentials.email)) {
        throw new Error('Email inválido');
      }
      
      if (!BRProjectHelpers.isValidUrl(credentials.url)) {
        throw new Error('URL inválida');
      }

      const result = await this.brprojectService.generateToken({
        email: credentials.email,
        password: credentials.senha,
        url: credentials.url
      });
      
      if (result.success && result.data?.token) {
        await this.trelloService.setUserData(
          result.data.token,
          credentials.url,
          result.data.usuario
        );
        
        this.currentUser = result.data.usuario;
        
        await this.showDashboard();
        
        return { success: true };
      } else {
        throw new Error(result.message || 'Erro na autenticação');
      }
      
    } catch (error) {
      console.error('[BoardPopup] Erro no login:', error);
      return { success: false, error: error.message };
    }
  }

  async refreshLastTaskAndRender(feedback = null) {
    try {
      const taskData = await this.brprojectService.getLastTask();
      let tasks = [];
      
      if (taskData?.success && taskData?.data?.atividade && taskData.data.atividade.tarefa) {
        const activity = taskData.data.atividade;
        tasks = [{
          idtarefa: activity.tarefa.idtarefa,
          nome: activity.tarefa.nome,
          descricao: activity.tarefa.descricao,
          referencia_id: activity.tarefa.referencia_id,
          data_inicio: activity.data_inicio,
          rodando: (activity.finalizada != 1)
        }];
      }
      
      this.renderDashboard({
        logado: true,
        tarefasEmAndamento: tasks,
        usuario: this.currentUser,
        boardData: this.boardData,
        feedback: feedback
      });
      
    } catch (error) {
      console.error('[BoardPopup] Erro ao recarregar tarefas:', error);
      this.renderDashboard({
        logado: true,
        tarefasEmAndamento: [],
        usuario: this.currentUser,
        boardData: this.boardData,
        feedback: feedback || { type: 'error', msg: 'Erro ao carregar tarefas' }
      });
    }
  }

  showError(message) {
    const root = document.getElementById('brproject-root');
    if (root) {
      root.innerHTML = `
        <div class="brproject-feedback brproject-feedback-error">
          ${BRProjectHelpers.sanitizeHtml(message)}
        </div>
      `;
    }
  }

  setupEventListeners() {
    const root = document.getElementById('brproject-root');
    if (!root) return;

    root.addEventListener('click', async (event) => {
      const target = event.target;
      
      if (target.id === 'btn-logout') {
        event.preventDefault();
        this.showLogoutConfirmation();
        return;
      }
      
      if (target.id === 'btn-logout-nao') {
        event.preventDefault();
        await this.refreshLastTaskAndRender();
        return;
      }
      
      if (target.id === 'btn-logout-sim') {
        event.preventDefault();
        await this.performLogout();
        return;
      }
      
      if (target.classList.contains('btn-parar-tarefa')) {
        event.preventDefault();
        await this.stopTask(target);
        return;
      }
      
      if (target.classList.contains('btn-iniciar-tarefa')) {
        event.preventDefault();
        await this.startTask(target);
        return;
      }
    });

    root.addEventListener('submit', async (event) => {
      if (event.target.id === 'brproject-form-login') {
        event.preventDefault();
        await this.handleLoginSubmit(event.target);
      }
    });
  }

  async handleLoginSubmit(form) {
    const submitBtn = form.querySelector('.js-login-submit');
    const errorEl = form.querySelector('.brproject-login-error');
    
    if (!submitBtn || !errorEl) return;

    const formData = new FormData(form);
    const credentials = {
      url: formData.get('url'),
      email: formData.get('email'),
      senha: formData.get('senha')
    };
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="brproject-loading"></span>Entrando...';
    errorEl.textContent = '';
    
    try {
      const result = await this.processLogin(credentials);
      
      if (!result.success) {
        errorEl.textContent = result.error || 'Erro ao autenticar';
      }
      
    } catch (error) {
      errorEl.textContent = error.message || 'Erro ao autenticar';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  }

  async stopTask(button) {
    const originalText = button.textContent;
    
    try {
      button.disabled = true;
      button.innerHTML = '<span class="brproject-loading"></span>Parando...';
      
      await this.brprojectService.stopTask();
      
      await this.refreshLastTaskAndRender({
        type: 'success',
        msg: 'Tarefa parada com sucesso!'
      });
      
    } catch (error) {
      console.error('[BoardPopup] Erro ao parar tarefa:', error);
      
      button.disabled = false;
      button.textContent = originalText;
      
      await this.refreshLastTaskAndRender({
        type: 'error',
        msg: 'Erro ao parar tarefa'
      });
    }
  }

  async startTask(button) {
    const originalText = button.textContent;
    const tarefaId = button.getAttribute('data-tarefa-id');
    const referencia = button.getAttribute('data-referencia-id') || null;
    const nome = decodeURIComponent(button.getAttribute('data-nome') || '');
    const descricao = decodeURIComponent(button.getAttribute('data-descricao') || '');
    
    try {
      button.disabled = true;
      button.innerHTML = '<span class="brproject-loading"></span>Iniciando...';

      const tarefaObj = {};
      if (tarefaId) tarefaObj.idtarefa = tarefaId;
      if (referencia) tarefaObj.referencia_id = referencia;
      tarefaObj.nome = nome;
      tarefaObj.descricao = descricao;

      await this.brprojectService.startTask(tarefaObj);
      
      await this.refreshLastTaskAndRender({
        type: 'success',
        msg: 'Tarefa iniciada com sucesso!'
      });
      
    } catch (error) {
      console.error('[BoardPopup] Erro ao iniciar tarefa:', error);
      
      button.disabled = false;
      button.textContent = originalText;
      
      await this.refreshLastTaskAndRender({
        type: 'error',
        msg: 'Erro ao iniciar tarefa'
      });
    }
  }
}

function initializeBoardPopup() {
  const component = new BoardPopupComponent();
  component.initialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBoardPopup);
} else {
  initializeBoardPopup();
}

window.BoardPopupComponent = BoardPopupComponent;