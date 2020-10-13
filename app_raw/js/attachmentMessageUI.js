(function(exports) {
  'use strict';

  exports.AttachmentMessageUI = {
    isAttachmentPage: false,

    init: function () {
      this.attachmentContainer = document.getElementById('attachmentMessage');

      // Set a array to save the all attachment nodes.
      this.attachmentList = [];

      this.updateOptionsBackUp = this.updateOptions.bind(this);
    },

    enterAttachmentPage: function () {
      this.attachmentContainer.classList.remove('hide');
      this.inputBox = document.getElementById('messages-to-field');
      this.attachmentField = document.querySelector('.js-attachment-composer');
      document.activeElement.blur();
      document.activeElement.classList.remove('focus');

      this.focusCount = 0;
      this.updateAttachmentList();
      this.inputBox.classList.add('hide');

      this.isAttachmentPage = true;
      this.setFocus(this.focusCount);
      this.attachmentList[this.focusCount].parentNode.scrollIntoView(false);
      this.updateSKs();

      window.addEventListener('keydown', this);
      window.addEventListener('gaia-confirm-close', this.updateSKs);
    },

    setFocus: function(index) {
      this.attachmentList[index].focus();
      this.attachmentList[index].classList.add('focus');
    },

    removeFocus: function(index) {
      this.attachmentList[index].blur();
      this.attachmentList[index].classList.remove('focus');
    },

    handleEvent: function(e) {
      if (NavigationMap && NavigationMap.optionMenuVisible) {
        return;
      }

      switch(e.key) {
        case 'Backspace':
          e.preventDefault();
          this.resetPageStatus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (this.attachmentList.length > 1) {
            if (this.focusCount > 0) {
              this.focusCount--;
              this.removeFocus(this.focusCount + 1);
            } else {
              this.focusCount = this.attachmentList.length - 1;
              this.removeFocus(0);
            }
          }
          this.setFocus(this.focusCount);
          this.attachmentList[this.focusCount].parentNode.scrollIntoView(false);
          this.updateSKs();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (this.attachmentList.length > 1) {
            if (this.focusCount < (this.attachmentList.length - 1)) {
              this.focusCount++;
              this.removeFocus(this.focusCount - 1);
            } else {
              this.focusCount = 0;
              this.removeFocus(this.attachmentList.length - 1);
            }
          }
          this.setFocus(this.focusCount);
          this.attachmentList[this.focusCount].parentNode.scrollIntoView(false);
          this.updateSKs();
          break;
      }
    },

    resetPageStatus: function() {
      if (this.attachmentList.length > 0) {
        this.attachmentList[this.focusCount].blur();
        this.attachmentList[this.focusCount].classList.remove('focus');
      }
      this.attachmentField.focus();
      this.attachmentField.classList.add('focus');

      this.attachmentList = [];
      this.isAttachmentPage = false;
      // Must remove the keydown listener when back to thread UI.
      window.removeEventListener('keydown', this);
      window.removeEventListener('gaia-confirm-close', this.updateSKs);
      this.attachmentContainer.classList.add('hide');
      this.inputBox.classList.remove('hide');
      ThreadUI.dynamicSK();
    },

    updateAttachmentList: function() {
      this.attachmentList = [];
      let allAttachments =
        document.getElementById('attachmentList').querySelectorAll('iframe');
      for(let i = 0; i < allAttachments.length; i++) {
        this.attachmentList.push(allAttachments[i]);
      }
    },

    updateOptions: function() {
      window.removeEventListener('menuEvent',
        AttachmentMessageUI.updateOptionsBackUp);

      let count = this.focusCount;
      if (this.attachmentList.length > 0) {
        let needIndex = count - 1;
        if (needIndex < 0) {
          this.setFocus(0);
        } else {
          this.setFocus(needIndex);
          if (needIndex === this.attachmentList.length - 1) {
            Compose.updateRealAttachment(
            this.attachmentList[needIndex]);
          }
        }
        this.focusCount = needIndex < 0 ? 0 : needIndex;
      } else {
        this.resetPageStatus();
        Compose.clearAttachment();
        NavigationMap.reset('thread-messages');
        let index = ThreadUI.getItemIndex(
          NavigationMap.getCurrentControl().elements, 'messages-input');
        NavigationMap.setFocus(index);
        Compose.updateEmptyState();
        Compose.updateType();
      }
    },

    updateSKs: function() {
      let skCancel = {
        l10nId: 'cancel',
        priority: 1,
        method: function() {
          AttachmentMessageUI.resetPageStatus();
        }
      };

      let skOpen = {
        l10nId: 'open',
        priority: 2,
        method: function() {
          let focusEle = document.activeElement;
          Compose.openAttachment(focusEle);
        }
      };

      let skAddAttachment = {
        l10nId: 'add-attachment',
        priority: 5,
        method: function() {
          let req = Compose.requestAttachment();
          req.onsuccess = (item) => {
            Compose.addAttachment(item);
            // Need update the attachment list to sync the latest attachment count number.
            AttachmentMessageUI.updateAttachmentList();
            AttachmentMessageUI.removeFocus(AttachmentMessageUI.focusCount);
            AttachmentMessageUI.focusCount =
              AttachmentMessageUI.attachmentList.length - 1;
            AttachmentMessageUI.setFocus(AttachmentMessageUI.focusCount);
            AttachmentMessageUI.attachmentList[AttachmentMessageUI.focusCount].
              parentNode.scrollIntoView(false);
          };
          req.onerror = (err) => {
            Compose._onAttachmentRequestError(err);
            AttachmentMessageUI.setFocus(AttachmentMessageUI.focusCount);
          };
        }
      };

      let skRemoveAttachment = {
        l10nId: 'remove-attachment',
        priority: 5,
        method: function() {
          let count = AttachmentMessageUI.focusCount;
          let attachmentList = AttachmentMessageUI.attachmentList;
          let focusEle = attachmentList[count];

          Compose.removeAttachment(focusEle, () => {
            AttachmentMessageUI.updateAttachmentList();
            Compose.updateAttachmentAbstract();

            window.addEventListener('menuEvent',
              AttachmentMessageUI.updateOptionsBackUp);
          });
        }
      };

      let skReplaceAttachment = {
        l10nId: 'replace-attachment',
        priority: 5,
        method: function() {
          let count = AttachmentMessageUI.focusCount;
          let attachmentList = AttachmentMessageUI.attachmentList;
          let focusEle = attachmentList[count];
          Compose.replaceAttachment(focusEle);
        }
      };

      let params = {
        header: {l10nId: 'options'},
        items: [skCancel, skOpen, skAddAttachment,
                skRemoveAttachment, skReplaceAttachment]
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