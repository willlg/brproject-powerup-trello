class TrelloService {
  constructor(trelloInstance) {
    this.t = trelloInstance;
    this.config = window.BRPROJECT_CONFIG;
  }

  async getUserData() {
    try {
      const [token, url, user] = await Promise.all([
        this.t.get('member', 'private', this.config.STORAGE_KEYS.TOKEN),
        this.t.get('member', 'private', this.config.STORAGE_KEYS.URL),
        this.t.get('member', 'private', this.config.STORAGE_KEYS.USER)
      ]);
      
      return { token, url, user };
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      return { token: null, url: null, user: null };
    }
  }

  async setUserData(token, url, user) {
    try {
      await Promise.all([
        this.t.set('member', 'private', this.config.STORAGE_KEYS.TOKEN, token),
        this.t.set('member', 'private', this.config.STORAGE_KEYS.URL, url),
        this.t.set('member', 'private', this.config.STORAGE_KEYS.USER, user)
      ]);
    } catch (error) {
      console.error('Erro ao salvar dados do usuário:', error);
      throw error;
    }
  }

  async clearUserData() {
    try {
      await Promise.all([
        this.t.remove('member', 'private', this.config.STORAGE_KEYS.TOKEN),
        this.t.remove('member', 'private', this.config.STORAGE_KEYS.URL),
        this.t.remove('member', 'private', this.config.STORAGE_KEYS.USER)
      ]);
    } catch (error) {
      console.error('Erro ao limpar dados do usuário:', error);
      throw error;
    }
  }

  async updateCardStatus(cardId, status, taskData) {
    const promises = [
      this.t.set('card', 'shared', this.config.CARD_SHARED_KEYS.STATUS, status)
    ];
    
    if (taskData) {
      promises.push(
        this.t.set('card', 'shared', this.config.CARD_SHARED_KEYS.TASK_NAME, taskData.nome || ''),
        this.t.set('card', 'shared', this.config.CARD_SHARED_KEYS.TASK_ID, taskData.idtarefa || ''),
        this.t.set('card', 'shared', this.config.CARD_SHARED_KEYS.START_TIME, taskData.data_inicio || '')
      );
      
      if (taskData.cliente) {
        promises.push(this.t.set('card', 'shared', this.config.CARD_SHARED_KEYS.CLIENT, taskData.cliente.nome));
      }
      
      if (taskData.projeto) {
        promises.push(this.t.set('card', 'shared', this.config.CARD_SHARED_KEYS.PROJECT, taskData.projeto.nome));
      }
    }
    
    try {
      return await Promise.all(promises);
    } catch (error) {
      console.error('Erro ao atualizar status do card:', error);
      throw error;
    }
  }

  async updateCardTime(timeData) {
    try {
      return await this.t.set('card', 'shared', this.config.CARD_SHARED_KEYS.TIME, timeData);
    } catch (error) {
      console.error('Erro ao atualizar tempo do card:', error);
      throw error;
    }
  }

  async clearCardData() {
    try {
      const keys = Object.values(this.config.CARD_SHARED_KEYS);
      const promises = keys.map(key => this.t.remove('card', 'shared', key));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Erro ao limpar dados do card:', error);
      throw error;
    }
  }

  async getContext() {
    try {
      return await this.t.getContext();
    } catch (error) {
      console.error('Erro ao obter contexto:', error);
      return null;
    }
  }

  async getCardId() {
    try {
      const context = await this.getContext();
      return context && context.card ? context.card : null;
    } catch (error) {
      console.error('Erro ao obter ID do card:', error);
      return null;
    }
  }

  async getBoardId() {
    try {
      const context = await this.getContext();
      return context && context.board ? context.board : null;
    } catch (error) {
      console.error('Erro ao obter ID do board:', error);
      return null;
    }
  }

  async getCardData(cardId = null) {
    try {
      if (!cardId) {
        return await this.t.card('id', 'name', 'desc');
      }
      return await this.t.card('id', 'name', 'desc');
    } catch (error) {
      console.error('Erro ao obter dados do card:', error);
      return null;
    }
  }

  async getBoardData(boardId = null) {
    try {
      if (!boardId) {
        return await this.t.board('id', 'name', 'desc', 'url');
      }
      return await this.t.board('id', 'name', 'desc', 'url');
    } catch (error) {
      console.error('Erro ao obter dados do board:', error);
      return null;
    }
  }

  async showNotification(type, message, duration = 4000) {
    try {
      return await this.t.alert({
        message: message,
        duration: duration,
        display: type === 'error' ? 'error' : 'info'
      });
    } catch (error) {
      console.error('Erro ao exibir notificação:', error);
    }
  }

  async openPopup(config) {
    try {
      return await this.t.popup(config);
    } catch (error) {
      console.error('Erro ao abrir popup:', error);
      throw error;
    }
  }

  async closePopup() {
    try {
      return await this.t.closePopup();
    } catch (error) {
      console.error('Erro ao fechar popup:', error);
    }
  }

  async isAuthorized() {
    try {
      const { token } = await this.getUserData();
      return !!token;
    } catch (error) {
      return false;
    }
  }
}