(function(exports) {
  'use strict';

  exports.BlockContacts = {
    atBlockPage: false,

    init: function() {
      this.atBlockPage = true;
      this.createList();
      this.focusCount = 0;

      this.blockPage = document.getElementById('block-contact-page');
      this.informationPage = document.getElementById('information-report');
      this.blockList = document.getElementById('block-list');

      this.blockList.firstChild.focus();
      this.blockList.firstChild.classList.add('focus');

      this.updateKeyBackUp = this.updateBlockSoftKey.bind(this);

      this.updateBlockList();
      this.updateBlockSoftKey();
      window.addEventListener('keydown', this);
      window.addEventListener('gaia-confirm-close', this.updateKeyBackUp);
    },

    handleEvent: function(e) {
      switch(e.key) {
        case 'Backspace':
          e.preventDefault();
          this.exitBlockPage();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (this.blockContactsList.length > 1) {
            if (this.focusCount > 0) {
              this.focusCount--;
              this.removeFocus(this.focusCount + 1);
            } else {
              this.focusCount = this.blockContactsList.length - 1;
              this.removeFocus(0);
            }
          }
          this.setFocus(this.focusCount);
          this.blockContactsList[this.focusCount].scrollIntoView(false);
          this.updateBlockSoftKey();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (this.blockContactsList.length > 1) {
            if (this.focusCount < (this.blockContactsList.length - 1)) {
              this.focusCount++;
              this.removeFocus(this.focusCount - 1);
            } else {
              this.focusCount = 0;
              this.removeFocus(this.blockContactsList.length - 1);
            }
          }
          this.setFocus(this.focusCount);
          this.blockContactsList[this.focusCount].scrollIntoView(false);
          this.updateBlockSoftKey();
          break;
      }
    },

    setFocus: function(index) {
      this.blockContactsList[index].focus();
      this.blockContactsList[index].classList.add('focus');
    },

    removeFocus: function(index) {
      this.blockContactsList[index].blur();
      this.blockContactsList[index].classList.remove('focus');
    },

    updateBlockList: function() {
      this.blockContactsList = [];
      let li = this.blockList.querySelectorAll('li');
      for(let i = 0; i < li.length; i++) {
        this.blockContactsList.push(li[i]);
      }
    },

    createList: function() {
      let recipients = ThreadUI.availableContact;
      let list = document.getElementById('block-list');
      for (let i = 0; i < recipients.length; i++) {
        let li = document.createElement('li');
        li.classList.add('block-contact-li');
        li.setAttribute('data-name', recipients[i].number);
        let a = document.createElement('a');
        let p1 = document.createElement('p');
        if (recipients[i].contact) {
          p1.textContent = recipients[i].contact;
        } else {
          p1.textContent = recipients[i].number;
        }

        p1.classList.add('block-contact-p');
        if (ThreadUI.blockContactsList.indexOf(recipients[i].number) !== -1) {
          a.classList.add('suggestion-adjust');
          li.classList.add('block-tag');
          li.classList.add('block-tag-adjust');
        }

        list.appendChild(li);
        li.appendChild(a);
        a.appendChild(p1);

        if (recipients[i].contact) {
          let p2 = document.createElement('p');
          p2.textContent = recipients[i].type + ', '+recipients[i].number;
          p2.classList.add('block-contact-p');
          a.appendChild(p2);
        }
      }
    },

    removeKeyListener: function() {
      window.removeEventListener('keydown', this);
      window.removeEventListener('gaia-confirm-close', this.updateKeyBackUp);
    },

    exitBlockPage: function() {
      ThreadUI.updateInformationSks(() => {
        BlockContacts.atBlockPage = false;
        BlockContacts.blockPage.classList.add('hide');
        BlockContacts.informationPage.classList.remove('hide');
        BlockContacts.blockList.textContent = '';
        BlockContacts.removeKeyListener();
        ReportView.updateContactList();
        ReportView.updateFocusElement();
      });
    },

    addBlockElement: function(contact) {
      let focusElement =
        BlockContacts.blockContactsList[BlockContacts.focusCount];
      if (ThreadUI.blockContactsList.indexOf(contact) === -1) {
        ThreadUI.blockContactsList.push(contact);
      }
      focusElement.classList.add('block-tag');
      focusElement.classList.add('block-tag-adjust');
      focusElement.querySelector('a').classList.add('suggestion-adjust');
    },

    removeBlockElement: function(contact) {
      let index = ThreadUI.blockContactsList.indexOf(contact);
      let focusElement =
        BlockContacts.blockContactsList[BlockContacts.focusCount];
      if (index !== -1) {
        ThreadUI.blockContactsList.splice(index, 1);
      }
      focusElement.classList.remove('block-tag');
      focusElement.classList.remove('block-tag-adjust');
      focusElement.querySelector('a').classList.remove('suggestion-adjust');
    },

    updateBlockSoftKey: function() {
      let number =
        this.blockContactsList[this.focusCount].getAttribute('data-name');
      let contactsAPI = navigator.mozContacts;

      let isBlock = ThreadUI.blockContactsList.indexOf(number) !== -1;

      let skCancel = {
        l10nId: 'cancel',
        priority: 1,
        method: function() {
          BlockContacts.exitBlockPage();
        }
      };

      let skBlock = {
        l10nId: 'blocked',
        priority: 3,
        method: function() {
          Utils.confirmAlert('confirmation-title', 'block-confirmation',
                             'cancel', null, null, null, 'blocked', () => {
            let req = contactsAPI.saveBlockedNumber(number);
            req.onsuccess = () => {
              BlockContacts.addBlockElement(number);
              BlockContacts.updateBlockSoftKey();
            };
          });
        }
      };

      let skUnBlock = {
        l10nId: 'unblocked',
        priority: 3,
        method: function() {
          let req = contactsAPI.removeBlockedNumber(number);
          req.onsuccess = () => {
            BlockContacts.removeBlockElement(number);
            BlockContacts.updateBlockSoftKey();
          };
        }
      };

      let items = [skCancel, skBlock];
      if (isBlock) {
        items = [skCancel, skUnBlock];
      }
      let params = {
        header: { l10nId: 'options' },
        items: items
      };

      if (exports.option) {
        exports.option.initSoftKeyPanel(params);
      } else {
        exports.option = new SoftkeyPanel(params);
      }
      exports.option.show();
    }
  };
}(this));