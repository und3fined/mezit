/**
 * Created by tclxa on 17-8-24.
 */

(function(exports) {
  'use strict';

  exports.MessageCache = {
    saveFromNode: function cache_saveFromNode(moduleId, node) {
      let html = node.outerHTML;
      // Should not cache anything if the data space exceed.
      Utils.exceedLimitSpace().then((exceed) => {
        if (!exceed) {
          this.save(moduleId, html);
        }
      });
    },

    save: function cache_save(moduleId, html) {
      let id = moduleId;

      let langDir = document.querySelector('html').getAttribute('dir');
      let lang = navigator.language;
      let cachedSoftkeyHtml;

      this.setListNumber();
      if (!Startup.isActivity) {
        let softkey = document.getElementById('softkeyPanel');
        let cachedSoftkeyNode = this
          .cloneAsInertNodeAvoidingCustomElementHorrors(softkey);
        if (cachedSoftkeyNode) {
          cachedSoftkeyNode.setAttribute('id', 'cachedSoftkeyPanel');
          cachedSoftkeyHtml = cachedSoftkeyNode.outerHTML;
        }
      } else {
        cachedSoftkeyHtml = MessageCacheRestore.softkeyCacheBackup;
      }

      html = window.HTML_CACHE_VERSION + (langDir ? ',' + langDir : '') +
             (lang ? ',' + lang : '' ) + ',' + cachedSoftkeyHtml + ':' + html;
      localStorage.setItem('html_cache_' + id, html);
    },

    setFTUMessage: function cache_setFTUMessage() {
      localStorage.setItem('FTUEnabled', 'true');
    },

    setListNumber: function cache_setListNumber() {
      let container = document.getElementById('threads-container');
      let listCount = container.querySelectorAll('li').length;
      let subCache = '1' + '/' + listCount;
      localStorage.setItem('subCount', subCache);
    },

    clear: function cache_clear(moduleId) {
      localStorage.removeItem('html_cache_' + moduleId);
    },

    cloneAsInertNodeAvoidingCustomElementHorrors:
     function cache_cloneAsInertNodeAvoidingCustomElementHorrors(node) {
      let templateNode = document.createElement('template');
      let cacheDoc = templateNode.content.ownerDocument;
      let cacheNode;
      if (cacheNode = cacheDoc.importNode(node, true)) {
        return cacheNode;
      } else {
        return null;
      }
    }
  };
})(this);
