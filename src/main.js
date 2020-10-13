/*
 * File: main.js
 * Project: mezit2.und3fined.com
 * File Created: 13 Oct 2020 00:13:36
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 13 Oct 2020 10:25:40
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
 */
import Vue from "vue";
import VueI18n from 'vue-i18n'

import App from "./App.vue";

import store from "./models";
import router from "./router";

import "@/assets/css/global.css";

Vue.config.productionTip = false;

// load i18n plugin
Vue.use(VueI18n)

new Vue({
  store,
  router,
  render: h => h(App)
}).$mount("#mezit-app");
