/*
 * File: startup.js
 * Project: mezit2.und3fined.com
 * File Created: 13 Oct 2020 10:27:09
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 13 Oct 2020 10:27:18
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
 */

const state = () => ({
  useCache: false,
  isActivity: false,
  messageReceive: false,
  hasGroup: false, // default group message is removed.
  firstDraftCheck: false
});

const mutations = {
  isActivity(state, status) {
    state.isActivity = status;
  },
  messageReceive(state, status) {
    state.messageReceive = status;
  }
};

export default {
  namespaced: true,
  state,
  mutations
};
