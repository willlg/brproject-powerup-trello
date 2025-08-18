class BRProjectPowerUp {
  constructor() {
    this.dependencies = [
      { name: 'TrelloPowerUp', obj: window.TrelloPowerUp },
      { name: 'BRPROJECT_CONFIG', obj: window.BRPROJECT_CONFIG },
      { name: 'BRPROJECT_ICONS', obj: window.BRPROJECT_ICONS },
      { name: 'BRProjectHelpers', obj: window.BRProjectHelpers },
      { name: 'BRProjectService', obj: window.BRProjectService }
    ];
  }

  initialize() {
    console.log('Verificando dependências...');
    
    if (!BRProjectHelpers.checkDependencies(this.dependencies)) {
      console.error('Não foi possível inicializar o power-up devido a dependências faltando');
      return;
    }

    console.log('Inicializando BRProject Power-Up...');
    console.log('Base URL:', window.BRPROJECT_CONFIG.BASE_URL);
    
    try {
      window.TrelloPowerUp.initialize({
        'board-buttons': this.getBoardButtons.bind(this),
        'card-back-section': this.getCardBackSection.bind(this),
        'authorization-status': this.getAuthorizationStatus.bind(this)
      });

      console.log('BRProject Power-Up inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar Power-Up:', error);
    }
  }

  getBoardButtons(t, options) {
    console.log('Configurando board buttons...');
    
    return [{
      icon: window.BRPROJECT_ICONS.BR,
      text: 'BRProject',
      callback: (t) => {
        console.log('Board button clicado');
        return t.popup({
          title: 'BRProject - Controle de Tarefas',
          url: window.BRPROJECT_CONFIG.BASE_URL + '/src/components/board-popup/board-popup.component.html',
          height: window.BRPROJECT_CONFIG.POPUP_CONFIG.BOARD_POPUP.height,
          width: window.BRPROJECT_CONFIG.POPUP_CONFIG.BOARD_POPUP.width
        });
      }
    }];
  }

  async getCardBackSection(t, options) {
    console.log('[DEBUG] card-back-section chamado');
    
    try {
      const token = await t.get('member', 'private', window.BRPROJECT_CONFIG.STORAGE_KEYS.TOKEN);
      
      if (token) {
        return {
          title: ' ',
          icon: window.BRPROJECT_ICONS.INVISIBLE,
          content: {
            type: 'iframe',
            url: t.signUrl(window.BRPROJECT_CONFIG.BASE_URL + '/src/components/card-status/card-status.component.html'),
            height: window.BRPROJECT_CONFIG.POPUP_CONFIG.CARD_STATUS.height
          }
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao obter seção do card:', error);
      return null;
    }
  }

  async getAuthorizationStatus(t, options) {
    try {
      const token = await t.get('member', 'private', window.BRPROJECT_CONFIG.STORAGE_KEYS.TOKEN);
      return { authorized: !!token };
    } catch (error) {
      console.error('Erro ao verificar autorização:', error);
      return { authorized: false };
    }
  }
}

function initializePowerUp() {
  const powerUp = new BRProjectPowerUp();
  powerUp.initialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePowerUp);
} else {
  initializePowerUp();
}

window.BRProjectPowerUp = BRProjectPowerUp;