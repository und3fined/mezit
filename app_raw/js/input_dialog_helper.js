
/* global LazyLoader */

(function(window) {
  'use strict';

  const TRANSITIONTIME = 300;
  const SHOWINGTIME = 600;
  const ACTIVATETIME = 500;

  /**
  Generic dialog helper this _depends_ on <gaia-confirm> but is not required
  to be loaded as part of the main gaia-confirm script.
  */
  function InputDialogHelper(config) {
    this.config = config;
  }

  InputDialogHelper.prototype = {
    activeElement: null,
    deltaTop: 100,
    Softkey: window.option,
    isShown: false,

    show: function(parent) {
      LazyLoader.load(['/shared/js/component_utils.js',
                       '/shared/elements/gaia_confirm/script.js'],
                      this._show.bind(this, parent));
    },

    _show: function(parent) {
      let config = this.config;
      this.parent = parent;
      this.activeElement = document.activeElement;
      let wrapper = document.createElement('div');

      let confirmClass = config.system ? 'insystem' : '';
      wrapper.innerHTML =
          '<gaia-confirm id="gaia-confirm" tabindex="1" class=' +
          confirmClass + '>' +
          '<h1 class="h1-dialog"></h1>' +
          '<div class="div-dialog">' +
          '<input class="input-dialog" type="tel" />' +
          '</div>' +
          '</gaia-confirm>';

      let element = wrapper.firstElementChild;

      this.element = element;

      element.dataset.type = config.type;
      element.addEventListener('confirm', this);
      element.addEventListener('cancel', this);
      // set a timeout for gaia-confirm transition finish(0.3s)
      setTimeout(() => {
        window.addEventListener('keydown', this, true);
      }, TRANSITIONTIME);

      let plist = element.querySelector('input');
      let title = element.querySelector('h1');
      let body = plist;

      let setL10nAttributes = function(element, options) {
        if ('string' === typeof options) {
          navigator.mozL10n.setAttributes(element, options);
        }

        if (options.id) {
          navigator.mozL10n.setAttributes(element, options.id, options.args);
        } else if (options.text) {
          element.textContent = element.value = options.text;
        }
      };

      setL10nAttributes(title, config.title);

      if (NavigationMap && NavigationMap.currentActivatedLength > -1) {
        if (NavigationMap.currentActivatedLength === 0) {
          NavigationMap.currentActivatedLength = 1;
        } else {
          setTimeout(() => {
            this.show(parent);
          }, SHOWINGTIME);
          return;
        }
      }
      element.setAttribute('hidden', '');
      parent.appendChild(element);
      this.activeElement.blur();
      this.activeElement.classList.remove('focus');

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          element.removeAttribute('hidden');
          this.isShown = true;
          window.dispatchEvent(new CustomEvent('gaia-confirm-open'));
        });
      });

      element.addEventListener('transitionend', function _showend(e) {
        e.target.removeEventListener('transitionend', _showend);
        e.target.focus();
        plist.focus();
        setL10nAttributes(body, config.body);
      });

      //init softkey
      let softkeyParams = {
        menuClassName: 'menu-button',
        header: {},
        items: []
      };
      if (config.cancel) {
        softkeyParams.items.push({
          name: '',
          priority: 1,
          l10nId: config.cancel.l10nId,
          method: function() {
          }
        });
      }
      if (config.confirm) {
        softkeyParams.items.push({
          name: '',
          priority: 3,
          l10nId: config.confirm.l10nId,
          method: function() {
          }
        });
      }
      if (window.option) {
        window.option.initSoftKeyPanel(softkeyParams);
      } else {
        window.option = new SoftkeyPanel(softkeyParams);
      }
      window.option.show();
    },

    destroy: function() {
      if (!this.element) {
        return;
      }
      setTimeout(function() {
        if (NavigationMap && NavigationMap.currentActivatedLength > -1) {
          NavigationMap.currentActivatedLength = 0;
        }
      }, ACTIVATETIME);
      this.activeElement.focus();
      this.activeElement.classList.add('focus');
      SettingsUI._updateSKs();
      // Ensure cleanup of our hacks!
      window.removeEventListener('keydown', this);
      this.element.addEventListener('transitionend', function removeAfterHide(e) {
        if (e.target !== this.element) {
          return;
        }

        this.element.parentNode.removeChild(this.element);
        this.element = null;
        this.isShown = false;
        window.dispatchEvent(new CustomEvent('gaia-confirm-close'));
      }.bind(this));

      this.element.setAttribute('hidden', '');
    },

    handleEvent: function(e) {
      // Ensure we hide the dialog in the face of other errors.
      if (!this.isShown) {
        return;
      }

      switch (e.type) {
        case 'confirm':
          this.destroy();
          let inputNumber = this.element.querySelector('input').value;
          let confirm = this.config.confirm.callback;
          confirm && confirm(inputNumber);
          break;
        case 'cancel':
          this.destroy();
          let cancel = this.config.cancel.callback;
          cancel && cancel();
          break;
      }

      let keyHandled = true;
      switch (e.key) {
        case 'Backspace':
          this.destroy();
          let back = this.config.backcallback;
          back && back();
          break;
        case 'SoftLeft':
          if (this.config.cancel && this.isShown) {
            this.element.dispatchEvent(new CustomEvent('cancel'));
          }
          break;
        case 'SoftRight':
          if (this.config.confirm && this.isShown) {
            this.element.dispatchEvent(new CustomEvent('confirm'));
          }
          break;
        default:
          keyHandled = false;
          break;
      }

      if (keyHandled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  // This name is intentionally verbose.
  window.InputDialogHelper = InputDialogHelper;
}(window));
