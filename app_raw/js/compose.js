/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Settings, Utils, Attachment, AttachmentMenu, MozActivity, SMIL,
        MessageManager,
        SubjectComposer,
        Navigation,
        Promise,
        ThreadUI,
        Threads,
        EventDispatcher,
        DOMError
*/
/*exported Compose */

'use strict';

/**
 * Handle UI specifics of message composition. Namely,
 * resetting (auto manages placeholder text), getting
 * message content, and message size
 */
let Compose = (function() {
  // delay between 2 counter updates while composing a message
  const UPDATE_DELAY = 500;

  // Min available chars count that triggers available chars counter
  const MIN_AVAILABLE_CHARS_COUNT = 20;

  let placeholderClass = 'placeholder';
  let attachmentClass = 'attachment-container';

  let attachments = new Map();

  /* << [BTS-1676]: BDC kanxj 20190911 add to support Full/reduce character in SMS >> */
  let isReduceMode = "1";

  // will be defined in init
  let dom = {
    form: null,
    message: null,
    subjectComposer: null,

    counter: null
  };

  let state = {
    empty: true,
    maxLength: null,
    size: null,
    lastScrollPosition: 0,
    resizing: false,

    // Stop further input because the max size is exceeded
    locked: false,

    // 'sms' or 'mms'
    type: 'sms',

    // flag to confirm whether need resize the compose size
    needResize: false,

    segmentInfo: {
      segments: 0,
      charsAvailableInLastSegment: 0
    },

    isTextLong: false
  };

  let subject = null;

  // Given a DOM element, we will extract an array of the
  // relevant nodes as attachment or text
  function getContentFromDOM(domElement) {
    let content = [];
    let node;

    for (node = domElement.firstChild; node; node = node.nextSibling) {
      // hunt for an attachment in the Map and append it
      let attachment = attachments.get(node);
      if (attachment) {
        content.push(attachment);
        continue;
      }

      let last = content.length - 1;
      let text = node.textContent;

      // Bug 877141 - contenteditable wil insert non-break spaces when
      // multiple consecutive spaces are entered, we don't want them.
      if (text) {
        text = text.replace(/\u00A0/g, ' ');
      }

      if (node.nodeName === 'BR') {
        if (node === domElement.lastChild) {
          continue;
        }
        text = '\n';
      }

      // append (if possible) text to the last entry
      if (text.length) {
        if (typeof content[last] === 'string') {
          content[last] += text;
        } else {
          content.push(text);
        }
      }
    }

    return content;
  }

  function insertAfter(newElement, targetElement) {
    let parent = targetElement.parentNode;
    if (parent.lastChild === targetElement) {
      parent.appendChild(newElement);
    } else {
      parent.insertBefore(newElement, targetElement.nextSibling);
    }
  }

  // anytime content changes - takes a parameter to check for image resizing
  function onContentChanged(duck) {
    // Track when content is edited for draft replacement case
    if (ThreadUI.draft) {
      if (!(duck && duck.detail === 'back-key')) {
        ThreadUI.draft.isEdited = true;
      }
    }

    let isEmptyMessage = !dom.message.textContent.length && !hasAttachment();

    if (isEmptyMessage) {
      let brs = dom.message.getElementsByTagName('br');
      // firefox will keep an extra <br> in there
      if (brs.length > 1) {
        isEmptyMessage = false;
      }
    }

    // Placeholder management
    let placeholding = dom.message.classList.contains(placeholderClass);
    if (placeholding && !isEmptyMessage) {
      dom.message.classList.remove(placeholderClass);
    }
    if (!placeholding && isEmptyMessage) {
      dom.message.classList.add(placeholderClass);
    }

    state.emptyMessage = isEmptyMessage;

    Compose.updateEmptyState();
    Compose.updateType();
    updateSegmentInfoThrottled();

    Compose.emit('input');
  }

  function onSubjectChanged() {
    // Track when content is edited for draft replacement case
    if (ThreadUI.draft) {
      ThreadUI.draft.isEdited = true;
    }

    Compose.updateEmptyState();
    Compose.updateType();

    Compose.emit('subject-change');
  }

  function onContentInput() {
    // The input method prevent the back event,
    // and it is more difficult to handle if input method not prevent
    // the back event. I think update the size and focus on input event
    // is not good idea, but it may be the only one method to fix
    // the problem that remove attachment by back key.
    if (state.type === 'mms') {
      state.needResize = true;
      let index = ThreadUI.getItemIndex(
        NavigationMap.getCurrentControl().elements, 'messages-input');
      NavigationMap.setFocus(index);
    }
    onContentChanged();
  }

  function onSubjectVisibilityChanged() {
    if (subject.isVisible()) {
      subject.focus();
      dom.subjectComposer.classList.add('subject-composer-visible');
    } else {
      dom.message.focus();
      dom.subjectComposer.classList.remove('subject-composer-visible');
    }
  }

  function hasAttachment() {
    return !dom.attachmentComposer.classList.contains('hide');
  }

  function hasSubject() {
    return subject.isVisible() && !!subject.getValue();
  }

  function composeKeyEvents(e) {
    // if locking and no-backspace pressed, cancel
    if (state.locked && e.which !== 8) {
      e.preventDefault();
    } else {
      // trigger a recompute of size on the keypresses
      state.needResize = true;
      compose.unlock();
    }
  }

  function insert(item) {
    let fragment = document.createDocumentFragment();
    if (!item) {
      return null;
    }

    // trigger recalc on insert
    state.needResize = true;

    if (typeof item === 'string') {
      item.split('\n').forEach(function(line) {
        fragment.appendChild(document.createTextNode(line));
        fragment.appendChild(document.createElement('br'));
      });
      fragment.lastElementChild.remove();
    }

    return fragment;
  }

  let segmentInfoTimeout = null;
  function updateSegmentInfoThrottled() {
    // we need to call updateSegmentInfo even in MMS mode if we have only text:
    // if we're in MMS mode because we have a long message, then we need to
    // check when we go back to SMS mode by having a shorter message.
    // A possible solution is to do it only when the user deletes characters in
    // MMS mode.
    if (hasAttachment()) {
      return resetSegmentInfo();
    }

    if (segmentInfoTimeout === null) {
      segmentInfoTimeout = setTimeout(updateSegmentInfo, UPDATE_DELAY);
    }
  }

  function updateSegmentInfo() {
    segmentInfoTimeout = null;

    let value = Compose.getText();

    /* << [BTS-1676]: BDC kanxj 20190911 add to support Full/reduce character in SMS */
    if(isReduceMode == "0") {
      value = MessageManager.shift2Normal(value);
    }
    /* >> [BTS-1676] */

    // saving one IPC call when we clear the composer
    let segmentInfoPromise = value ?
      MessageManager.getSegmentInfo(value) :
      Promise.reject();

    segmentInfoPromise.then(function(segmentInfo) {
      state.segmentInfo = segmentInfo;
    }, resetSegmentInfo).then(
      compose.updateType.bind(Compose)).then(
      compose.emit.bind(compose, 'segmentinfochange'));
  }

  function resetSegmentInfo() {
    state.segmentInfo = {
      segments: 0,
      charsAvailableInLastSegment: 0
    };
  }

  let compose = {
    init: function composeInit(formId) {
      dom.form = document.getElementById(formId);
      dom.subjectComposer = document.querySelector('.js-subject-composer');
      dom.attachmentComposer = document.querySelector('.js-attachment-composer');
      dom.message = document.getElementById('messages-input');
      dom.optionsMenu = document.getElementById('attachment-options-menu');
      dom.counter = document.getElementById('letter-counter');
      dom.messagesAttach = dom.form.querySelector('.messages-attach-container');
      dom.composerButton = dom.form.querySelector('.composer-button-container');
      dom.composerSubject = document.querySelector('#subject-composer-input');
      dom.messageTypeLine = document.querySelector('.message-type-line');

      if (Settings.mmsEnable) {
        document.querySelector('.sms-label')
          .setAttribute('data-l10n-id', 'sms-label');
      }

      subject = new SubjectComposer(dom.subjectComposer);
      subject.on('change', onSubjectChanged);
      subject.on('visibility-change', onSubjectChanged);
      subject.on('visibility-change', onSubjectVisibilityChanged);

      // update the placeholder, send button and Compose.type
      dom.message.addEventListener('input', onContentInput);

      // we need to bind to keydown & keypress because of #870120
      dom.message.addEventListener('keydown', composeKeyEvents);
      dom.message.addEventListener('keypress', composeKeyEvents);

      dom.message.addEventListener('click',
        this.onAttachmentClick.bind(this));

      this.offAll();
      this.clear();

      this.on('type', this.onTypeChange.bind(this));
      this.on('type', this.updateMessageCounter.bind(this));
      this.on('segmentinfochange', this.updateMessageCounter.bind(this));

      /* Bug 1040144: replace ThreadUI direct invocation by a instanciation-time
       * property */

      // Bug 1026384: call updateType as well when the recipients change

      if (Settings.supportEmailRecipient) {
        ThreadUI.on('recipientschange', this.updateType.bind(this));
      }

      let onInteracted = this.emit.bind(this, 'interact');

      dom.message.addEventListener('focus', onInteracted);
      dom.message.addEventListener('click', onInteracted);
      dom.message.addEventListener('focus', this.focus.bind(this));
      dom.composerButton.addEventListener('click', onInteracted);
      dom.attachmentComposer.addEventListener('focus', onInteracted);
      subject.on('focus', onInteracted);

      /* << [BTS-1676]: BDC kanxj 20190911 add to support Full/reduce character in SMS */
      try {
        Utils.getSettingsValue("ril.sms.encoding_mode").then((value) => {
          dump("compose init : value  is " + value );
          isReduceMode = value;
        });

        Utils.observerSettingsValue("ril.sms.encoding_mode", (value) => {
          dump("compose obser : value  is " + value );
          isReduceMode = value;
        });
      } catch (e) {
        isReduceMode = "1";
      }
      /* >> [BTS-1676] */
      return this;
    },

    getContent: function(onlytext) {
      let allContent = getContentFromDOM(dom.message);

      if (onlytext) {
        return allContent;
      }

      let attachmentContent = this.getAttachment();

      // Add the attachment field to content field.
      for (let i = 0; i < attachmentContent.length; i++) {
        allContent.push(attachmentContent[i]);
      }

      return allContent;
    },

    addEmptyFied: function(attachmentContainer) {
      let textNode = document.createTextNode('');
      insertAfter(textNode, attachmentContainer);
      attachmentContainer.textNode = textNode;
    },

    getSubject: function() {
      return subject.getValue();
    },

    setSubject: function(value) {
      return subject.setValue(value);
    },

    isSubjectMaxLength: function() {
      return subject.getValue().length >= subject.getMaxLength();
    },

    showSubject: function() {
      subject.show();
      this._addSubjectFocusable()
    },

    hideSubject: function() {
      subject.hide();
      subject.reset();
      this._removeSubjectFocusable();
    },

    _addSubjectFocusable: function() {
      dom.composerSubject.classList.add('navigable');
    },

    _removeSubjectFocusable: function() {
      dom.composerSubject.classList.remove('navigable');
    },

    /** Render draft
     *
     * @param {Draft} draft Draft to be loaded into the composer.
     *
     */
    fromDraft: function(draft) {
      // Clear out the composer
      this.clear();

      // If we don't have a draft, return only having cleared the composer
      if (!draft) {
        return;
      }

      if (draft.subject) {
        this.setSubject(draft.subject);
        this.showSubject();
        dom.subjectComposer.querySelector('input').classList.add('navigable');
      }

      if (draft.attachment) {
        for(let i = 0; i < draft.attachment.length; i++) {
          if (draft.attachment[i].blob) {
            draft.attachment[i] = new Attachment(draft.attachment[i].blob, {
              name: draft.attachment[i].name,
              isDraft: true
            });
          }
          this.addAttachment(draft.attachment[i]);
        }
      }

      // draft content is an array
      draft.content.forEach(function(fragment) {
        // Append each fragment in order to the composer
        Compose.append(fragment);
      }, Compose);

      this.focus();
    },

    /** Render message (sms or mms)
     *
     * @param {message} message Full message to be loaded into the composer.
     *
     */
    fromMessage: function(message) {
      this.clear();

      if (message.type === 'mms') {
        if (message.subject) {
          this.setSubject(message.subject);
          this.showSubject();
        }
        SMIL.parse(message, function(elements) {
          elements.forEach(function(element) {
            if (element.blob) {
              let attachment = new Attachment(element.blob, {
                name: element.name,
                isDraft: true
              });
              this.addAttachment(attachment);
            }
            if (element.text) {
              this.append(element.text);
            }
          }, this);
          this.ignoreEvents = false;
        }.bind(this));
        this.ignoreEvents = true;
      } else {
        this.append(message.body);
      }
    },

    getText: function() {
      let out = this.getContent().filter(function(elem) {
        return (typeof elem === 'string');
      });
      return out.join('');
    },

    isEmpty: function() {
      return state.empty;
    },

    isFocused: function() {
      return document.activeElement.id === dom.message.id;
    },

    isSubjectFocused: function() {
      return subject.isFocused();
    },

    /**
     * Lock composer when size limit is reached.
     */
    lock: function() {
      state.locked = true;
    },

    /**
     * Unlock composer when size is decreased again.
     */
    unlock: function() {
      state.locked = false;
    },

    scrollToTarget: function(target) {
      // target can be an element or a selection range
      let targetRect = target.getBoundingClientRect();

      // put the middle of the target at the middle of the container box
      let containerRect = dom.message.getBoundingClientRect();
      let offset = (targetRect.top + targetRect.height / 2) -
                   (containerRect.top + containerRect.height / 2);

      // we += because the scrollTop that was set is already compensated
      // with the getBoundingClientRect()
      dom.message.scrollTop += offset;
    },

    scrollMessageContent: function() {
      if (document.activeElement === dom.message) {
        // we just got the focus: ensure the caret is visible
        let range = window.getSelection().getRangeAt(0);
        if (range.collapsed) {
          // We can't get the bounding client rect of a collapsed range,
          // so let's insert a temporary node to get the caret position.
          range.insertNode(document.createElement('span'));
          this.scrollToTarget(range);
          range.deleteContents();
        } else {
          this.scrollToTarget(range);
        }
        state.lastScrollPosition = dom.message.scrollTop;
      } else {
        // we just lost the focus: restore the last scroll position
        dom.message.scrollTop = state.lastScrollPosition;
      }
    },

    /** Writes node to composition element
     * @param {mixed} item Html, DOMNode, or attachment to add
     *                     to composition element.
     * @param {object} options Confirm whether need ignore the change of focus.
     */

    // if item is an array, ignore calling onContentChanged for each item
    append: function(item, options) {
      options = options || {};
      if (Array.isArray(item)) {
        item.forEach((content) => {
          this.append(content, { ignoreChange: true });
        });
        onContentChanged();
      } else {
        let fragment = insert(item);
        if (!fragment) {
          return this;
        }

        if (document.activeElement === dom.message) {
          // insert element at caret position
          let range = window.getSelection().getRangeAt(0);
          let firstNodes = fragment.firstChild;
          range.deleteContents();
          range.insertNode(fragment);
          this.scrollToTarget(range);
          dom.message.focus();
          range.setStartAfter(firstNodes);
        } else {
          // insert element at the end of the Compose area
          dom.message.insertBefore(fragment, dom.message.lastChild);
          this.scrollToTarget(dom.message.lastChild);
        }
        if (!options.ignoreChange) {
          onContentChanged(item);
          ThreadUI.onFocusChanged();
        }
      }
      return this;
    },

    clear: function() {
      // changing the type here prevents the "type" event from being fired
      state.type = 'sms';
      this.onTypeChange();

      this.clearComposeContent();
      this.clearAttachment();
      subject.reset();
      this.clearSubjectFocusable();
      return this;
    },

    clearSubjectFocusable: function() {
      dom.composerSubject.classList.remove('focus', 'navigable');
    },

    focus: function() {
      dom.message.focus();
      dom.message.classList.add('focus');
      if (ThreadUI.notFocus) {
        dom.message.blur();
        ThreadUI.notFocus = false;
      }

      //Put the cursor at the end of the message
      let selection = window.getSelection();
      let range = document.createRange();
      let lastChild = dom.message.lastChild;
      if (lastChild.tagName === 'BR') {
        range.setStartBefore(lastChild);
      } else {
        range.setStartAfter(lastChild);
      }
      selection.removeAllRanges();
      selection.addRange(range);

      return this;
    },

    updateType: function() {
      let isTextTooLong =
        state.segmentInfo.segments > Settings.maxConcatenatedMessages;
      let isGroup = Settings.isGroup;

      /* Bug 1040144: replace ThreadUI direct invocation by a instanciation-time
       * property
       */
      let recipients = Threads.active ?
        Threads.active.participants :
        ThreadUI.recipients && ThreadUI.recipients.numbers;
      let hasEmailRecipient = recipients ?
        recipients.some(Utils.isEmailAddress) :
        false;

      let typeChangeTimeOut = 2000;

      /* Note: in the future, we'll maybe want to force 'mms' from the UI */
      if (Settings.mmsEnable) {
        /* << [BTS-112]: BDC kanxj 20190328 porting to disable SMS conversion to MMS by default */
        /*let newType =
          hasAttachment() || hasSubject() || hasEmailRecipient ||
          isTextTooLong || isGroup ?
          'mms' : 'sms';*/
        let newType =
          hasAttachment() || hasSubject() || hasEmailRecipient ||
          isGroup ?
          'mms' : 'sms';
         /* >> [BTS-112]*/

        if (newType !== state.type) {
          state.type = newType;
          this.emit('type');
        }
      } else {
        if (isTextTooLong !== this.isTextLong) {
          this.isTextLong = isTextTooLong;
          ThreadUI.dynamicSK();

          if (isTextTooLong) {
            Toaster.showToast({
              messageL10nId: 'isTextTooLongAlert',
              latency: typeChangeTimeOut
            });
          }
        }
      }
    },

    updateEmptyState: function() {
      state.empty = state.emptyMessage && !hasSubject() && !hasAttachment();
    },

    clearComposeContent: function() {
      dom.message.innerHTML = '<br>';

      state.resizing = false;
      state.size = 0;

      resetSegmentInfo();
      segmentInfoTimeout = null;

      onContentChanged();
    },

    // An open interface to listen the input change,
    // used at message paste situation.
    handlerContentChanged: function() {
      onContentChanged();
    },

    // Send button management
    /* The send button should be enabled only in the situations where:
     * - The subject is showing and is not empty (it has text)
     * - The message is not empty (it has text or attachment)
    */
    disableSendButton: function() {
      // should disable if we have no message input
      let disableSendMessage = state.empty || state.resizing;
      let messageNotLong = compose.size <= Settings.mmsSizeLimitation;

      /* Bug 1040144: replace ThreadUI direct invocation by a instanciation-time
       * property */
      let recipients = ThreadUI.recipients;
      let recipientsValue = recipients && recipients.inputValue;
      let hasRecipients = false;

      let recipientMMSLimit = (state.type === 'mms') &&
                              (recipients && recipients.length > 20);

      if (recipientMMSLimit) {
        this.showMMSLimitAlert();
      }

      // Set hasRecipients to true based on the following conditions:
      //
      //  1. There is a valid recipients object
      //  2. One of the following is true:
      //      - The recipients object contains at least 1 valid recipient
      //        - OR -
      //      - There is >=1 character typed and the value is a finite number
      //
      if (recipients &&
          (recipients.numbers.length ||
           (recipientsValue && isFinite(recipientsValue)))) {
        hasRecipients = true;
      }

      // should disable if the message is too long
      disableSendMessage = disableSendMessage || !messageNotLong;

      // should disable if we have no recipients in the "new thread" view
      disableSendMessage = disableSendMessage ||
        (Navigation.isCurrentPanel('composer') && !hasRecipients);

      // should disable if the MMS recipients above 20
      disableSendMessage = disableSendMessage || recipientMMSLimit;

      return disableSendMessage;
    },

    showMMSLimitAlert: function() {
      let limitTimeOut = 2000;
      Toaster.showToast({
        messageL10nId: 'limit-MMS-recipients',
        latency: limitTimeOut
      });
    },

    // Handle the attachment flow, may move it to a independent js file later.
    _onAttachmentRequestError: function c_onAttachmentRequestError(err) {
      let errId = err instanceof DOMError ? err.name : err.message;
      if (errId === 'file too large') {
        option.hide();
        ThreadUI.confirmDialogShown = true;
        let dialogConfig = {
          title: { id: 'attention', args: {} },
          body: {
            id: 'attached-files-too-large', args: {
              n: 1,
              mmsSize: (Settings.mmsSizeLimitation / 1024 / 1024).toFixed(2)
            }
          },
          desc: { id: '', args: {} },
          accept: {
            l10nId: 'confirm-dialog-ok',
            priority: 2,
            callback: function() {
              option.show();
              ThreadUI.confirmDialogShown = false;
            },
          },
          backcallback: function() {
            ThreadUI.confirmDialogShown = false;
          }
        };
        let dialog = new ConfirmDialogHelper(dialogConfig);
        dialog.show(document.getElementById('file-large-confirmation-dialog'));
        setTimeout(() => {
          window.focus();
        }, 400);
      //'pick cancelled' is the error thrown when the pick activity app is
      // canceled normally
      } else if (errId !== 'ActivityCanceled' && errId !== 'pick cancelled') {
        console.warn('Unhandled error: ', err);
      }
    },

    onAttachClick: function thui_onAttachClick() {
      let request = this.requestAttachment();
      request.onsuccess = this.addAttachment.bind(this);
      request.onerror = this._onAttachmentRequestError;
    },

    addAttachments: function(blobs) {
      if (Array.isArray(blobs)) {
        for(let i = 0; i < blobs.length; i++) {
          this.addAttachment(blobs[i]);
        }
      } else {
        this.addAttachment(blobs);
      }
    },

    addAttachment: function thui_addAttachment(item) {
      dom.attachmentComposer.classList.remove('hide');
      dom.attachmentComposer.classList.add('navigable');
      // Need reset the nav id because the map change.
      NavigationMap.reset('thread-messages');
      dom.attachmentComposer.querySelector('label').textContent =
        item.name.substr(item.name.lastIndexOf('/') + 1);

      this.appendAttachment(item);
      this.updateAttachmentAbstract();

      if (window.performance.getEntriesByName(
          'add-attachment-start', 'mark').length > 0) {
        window.performance.mark('add-attachment-end');
        window.performance.measure('performance-add-attachment',
          'add-attachment-start', 'add-attachment-end');
        window.performance.clearMarks('add-attachment-start');
        window.performance.clearMarks('add-attachment-end');
      }
    },

    updateRealAttachment: function(node) {
      let attachment = attachments.get(node);
      let attachmentName =
        attachment.name.substr(attachment.name.lastIndexOf('/') + 1);
      let messageCount = this.getMessageCount();
      let attachmentRealName = attachmentName;
      if (messageCount > 1) {
        attachmentRealName = attachmentName + '(+' + (messageCount - 1) + ')';
      }
      dom.attachmentComposer.querySelector('label').textContent = attachmentRealName;
    },

    updateAttachmentAbstract: function() {
      let messageCount = this.getMessageCount();
      let label = dom.attachmentComposer.querySelector('label');
      let index = label.textContent.indexOf('(');
      let realAbstract;
      if (index !== -1) {
        realAbstract = label.textContent.substr(0, index);
      } else {
        realAbstract = label.textContent;
      }

      if (messageCount > 1) {
        label.textContent = realAbstract + '(+' + (messageCount - 1) + ')';
      } else {
        label.textContent = realAbstract;
      }
    },

    getMessageCount: function() {
      let count = 0;
      attachments.forEach(() => {
        count++;
      });
      return count;
    },

    appendAttachment: function(item, callback) {
      let fragment = this.insertAttachment(item);

      if (!fragment) {
        return this;
      }

      let attachmentDiv = document.createElement('div');
      attachmentDiv.appendChild(fragment);

      let attachmentList = document.getElementById('attachmentList');
      attachmentList.appendChild(attachmentDiv);

      // Decide whether need resize image and achieve it.
      this.imageAttachmentsResize(() => {
        //BTS-1688 Need reset the content change event when the resize feature complete --Begin
        onContentChanged();
        //BTS-1688 --End
        if (callback) {
          callback();
        }
      });

      // Need update the message status when attachment change.
      this.updateEmptyState();
      this.updateType();
      ThreadUI.checkMessageSize();
      onContentChanged();

      return this;
    },

    imageAttachmentsResize: function(callback) {
      let messageSize = Compose.size;

      // There is no need to resize image attachment if total
      // message size doen't exceed mms size limitation.
      if (messageSize < Settings.mmsSizeLimitation) {
        callback();
        return;
      }

      let imgNodes = [];
      attachments.forEach((attachment, node) => {
        if (attachment.type === 'img') {
          imgNodes.push(node);
        }
      });

      let done = 0;

      // Resize image rules:
      // 1. Total number of images < 3
      //    => Set max image size to 2/5 message size limitation.
      // 2. Total number of images >= 3
      //    => Set max image size to 1/5 message size limitation.
      let images = imgNodes.length;
      // Only resize the image object.
      if (images === 0) {
        callback();
        return;
      }

      let limit = images > 2 ? Settings.mmsSizeLimitation * 0.2 :
                               Settings.mmsSizeLimitation * 0.4;

      function imageSized() {
        if (++done === images) {
          // All images resize completed.
          state.resizing = false;
          ThreadUI.checkMessageSize();
          callback();

          // It is a fix method for the special situation
          // that press right key continuously
          if (window.option && window.option.menuVisible) {
            window.addEventListener('menuEvent', function updateOptions() {
              window.removeEventListener('menuEvent', updateOptions);
              ThreadUI.dynamicSK();
            });
          } else {
            ThreadUI.dynamicSK();
          }
        } else {
          resizedImg(imgNodes[done]);
        }
      }

      function resizedImg(node) {
        let item = attachments.get(node);
        if (item.blob.size < limit) {
          imageSized();
        } else {
          Utils.getResizedImgBlob(item.blob, limit, (resizedBlob) => {
            state.needResize = true;
            // Update the resized image to original image.
            item.blob = resizedBlob;
            item.updateFileSize();

            imageSized();
          });
        }
      }

      state.resizing = true;
      resizedImg(imgNodes[0]);
    },

    insertAttachment: function(item) {
      let fragment = document.createDocumentFragment();

      // Only one protection design.
      if (!item) {
        return null;
      }

      state.needResize = true;
      // Adjust whether it is an attachment.
      if (item.render) {
        let node = item.render();
        node.classList.remove('navigable');
        // Save the attachment to backup array.
        attachments.set(node, item);
        fragment.appendChild(node);
      }

      return fragment;
    },

    openAttachment: function(element) {
      let attachmentItem = attachments.get(element);
      attachmentItem.view();
    },

    deleteAttachment: function() {
      this.clearAttachment();
      // Need reset the nav id because the map change.
      NavigationMap.reset('thread-messages');

      window.addEventListener('menuEvent', function updateOptions() {
        window.removeEventListener('menuEvent', updateOptions);
        let index = ThreadUI.getItemIndex(
          NavigationMap.getCurrentControl().elements, 'messages-input');
        NavigationMap.setFocus(index);
      });

      this.updateEmptyState();
      this.updateType();
    },

    clearAttachment: function() {
      dom.attachmentComposer.classList.add('hide');
      dom.attachmentComposer.classList.remove('navigable');
      dom.attachmentComposer.blur();
      dom.attachmentComposer.classList.remove('focus');
      dom.attachmentComposer.querySelector('label').textContent = '';
      let attachmentList = document.getElementById('attachmentList');
      if (attachmentList) {
        attachmentList.innerHTML = '';
      }
      // Clear map object when delete action executed.
      attachments.clear();
      onContentChanged();
    },

    removeAttachment: function(node, callback) {
      let attachmentList = document.getElementById('attachmentList');
      attachmentList.removeChild(node.parentNode);
      attachments.delete(node);
      /* << [BTS-2603]: BDC kanxj DUT should not prompt dialog of MMS Attention about limit size when the size is less than 300KB >> */
      state.needResize = true;
      onContentChanged();
      callback();
    },

    replaceAttachment: function(node) {
      let request = this.requestAttachment();
      request.onsuccess = (item) => {
        this.removeAttachment(node, () => {
          this.appendAttachment(item, () => {
            AttachmentMessageUI.updateAttachmentList();
            let list = AttachmentMessageUI.attachmentList;
            AttachmentMessageUI.setFocus(list.length - 1);
            list[list.length - 1].parentNode.scrollIntoView(false);
            AttachmentMessageUI.focusCount = list.length - 1;
            this.updateRealAttachment(list[AttachmentMessageUI.focusCount]);
          });
        });
      };
      request.onerror = this._onAttachmentRequestError;
    },

    getAttachment: function() {
      let attachmentContent = [];
      attachments.forEach((attachment) => {
        attachmentContent.push(attachment);
      });
      return attachmentContent;
    },

    onAttachmentClick: function thui_onAttachmentClick(event) {
      if (event.target.classList.contains(attachmentClass) && !state.resizing &&
          !ThreadUI.optionMenuShown) {
        this.currentAttachmentDOM = event.target;
        this.currentAttachment = attachments.get(event.target);
        this.currentAttachment.view();
      }
    },
    // Handle the attachment flow, may move it to a independent js file later.

    onTypeChange: function c_onTypeChange() {
      if (this.type === 'sms') {
        dom.message.setAttribute('x-inputmode', '-moz-sms');
      } else {
        dom.message.removeAttribute('x-inputmode');
      }

      dom.form.dataset.messageType = this.type;
    },

    updateMessageCounter: function c_updateMessageCounter() {
      let counterValue = '';

      if (this.type === 'sms') {
        let segments = state.segmentInfo.segments;
        let availableChars = state.segmentInfo.charsAvailableInLastSegment;

        if (segments && (segments > 1 ||
            availableChars <= MIN_AVAILABLE_CHARS_COUNT)) {
          counterValue = availableChars + '/' + segments;
        }
      }

      if (counterValue !== dom.counter.textContent) {
        dom.counter.textContent = counterValue;
      }

      if (this.type === 'sms' && dom.counter.textContent === '' &&
          !Settings.mmsEnable) {
        dom.messageTypeLine.classList.add('message-type-line-empty');
      } else {
        dom.messageTypeLine.classList.remove('message-type-line-empty');
      }
    },

    /** Initiates a 'pick' MozActivity allowing the user to create an
     * attachment
     * @return {Object} requestProxy A proxy for the underlying DOMRequest API.
     *                               An "onsuccess" and/or "onerror" callback
     *                               method may optionally be defined on this
     *                               object.
     */
    requestAttachment: function() {
      // Mimick the DOMRequest API
      let requestProxy = {};
      let activityData = {
        type: ['image/*', 'audio/*', 'video/*', 'text/vcard']
      };
      let activity;

      if (Settings.mmsSizeLimitation) {
        activityData.maxFileSizeBytes = Settings.mmsSizeLimitation;
      }

      activity = new MozActivity({
        name: 'pick',
        data: activityData
      });

      activity.onsuccess = function() {
        let result = activity.result;

        if (Settings.mmsSizeLimitation &&
            result.blob.size > Settings.mmsSizeLimitation &&
            Utils.typeFromMimeType(result.blob.type) !== 'img') {
          if (typeof requestProxy.onerror === 'function') {
            requestProxy.onerror(new Error('file too large'));
          }
          return;
        }

        if (typeof requestProxy.onsuccess === 'function') {
          requestProxy.onsuccess(new Attachment(result.blob, {
            name: result.name,
            isDraft: true
          }));
          window.focus();
        }
      };

      // Re-throw Gecko-level errors
      activity.onerror = function() {
        if (typeof requestProxy.onerror === 'function') {
          requestProxy.onerror.call(requestProxy, activity.error);
        }
      };

      return requestProxy;
    }
  };

  Object.defineProperty(compose, 'type', {
    get: function composeGetType() {
      return state.type;
    }
  });

  Object.defineProperty(compose, 'size', {
    get: function composeGetSize() {
      if (state.needResize) {
        state.size = this.getContent().reduce(function(sum, content) {
          if (typeof content === 'string') {
            return sum + content.length;
          } else {
            return sum + content.size;
          }
        }, 0);
        state.needResize = false;
      }

      return state.size;
    }
  });

  Object.defineProperty(compose, 'segmentInfo', {
    get: function composeGetSegmentInfo() {
      return state.segmentInfo;
    }
  });

  Object.defineProperty(compose, 'isResizing', {
    get: function composeGetResizeState() {
      return state.resizing;
    }
  });

  Object.defineProperty(compose, 'isSubjectVisible', {
    get: function composeIsSubjectVisible() {
      return subject.isVisible();
    }
  });

  Object.defineProperty(compose, 'ignoreEvents', {
    set: function composeIgnoreEvents(value) {
      dom.message.classList.toggle('ignoreEvents', value);
    }
  });

  return EventDispatcher.mixin(compose, [
    'input',
    'type',
    'segmentinfochange',
    'interact',
    'subject-change'
  ]);
}());
