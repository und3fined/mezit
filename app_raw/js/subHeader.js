(function(exports) {
  'use strict';

  exports.SubHeader = {
    headerNode: null,
    listContainer: null,
    listArray: [],
    listLength: null,

    init: function() {
      this.headerNode = document.querySelector('.view-number');
    },

    resetHeaderNumber: function() {
      this.headerNode.textContent = '0/0';
    },

    updateSubNumber: function() {
      let listNodes = this.getAllListNode();
      let currentNode = this.getCurrentPosition();
      this.headerNode.textContent = currentNode + '/' + listNodes;
    },

    getAllListNode: function() {
      this.listArray = [];
      this.listContainer = document.getElementById('threads-container');
      let allNodes = this.listContainer.querySelectorAll('li');
      for (let i = 0; i < allNodes.length; i++) {
        this.listArray.push(allNodes[i].id);
      }
      return this.listArray.length;
    },

    getCurrentPosition: function() {
      let activeNode = document.activeElement;
      return (this.listArray.indexOf(activeNode.id) + 1);
    }
  };
}(this));