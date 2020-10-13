/*
 * File: index.js
 * Project: mezit2.und3fined.com
 * File Created: 13 Oct 2020 10:24:26
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 13 Oct 2020 10:24:29
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
 */
import Vue from "vue";
import Vuex from "vuex";

import startup from "./modules/startup";
import message from "./modules/message";

import MessagePlugin from "./plugins/message";

Vue.use(Vuex);

const messagePlugin = MessagePlugin(navigator.mozMobileMessage);

export default new Vuex.Store({
  modules: {
    startup,
    message
  },
  plugins: [messagePlugin]
});
