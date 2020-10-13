/*
 * File: message.js
 * Project: mezit2.und3fined.com
 * File Created: 13 Oct 2020 10:59:38
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 13 Oct 2020 10:59:41
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
 */
import { isProd } from "@/helpers/env";

const mozMobileMessage = navigator.mozMobileMessage;

const state = () => ({
  items: []
});

const getters = {
  list: state => {
    return state.items.sort((left, right) => left.timestamp < right.timestamp);
  }
};

const mutations = {
  add(state, message) {
    console.info("message", message);

    state.items.push(message);
  }
};

const actions = {
  getThreads: ({ commit, dispatch }) => {
    let cursor = null;

    if (!isProd()) return dispatch("getThreadsMock");

    try {
      cursor = mozMobileMessage.getThreads();
    } catch (e) {
      console.error("Error occurred while retrieving threads: " + e.name);
    }
    cursor.onsuccess = function onsuccess() {
      if (this.result) {
        commit("add", this.result);
        this.continue();
        return;
      }
    };

    cursor.onerror = function onerror() {
      console.error("Reading the database. Error: " + this.error.name);
    };
  },

  getThreadsMock: ({ commit }) => {
    for (let i = 0; i < 3; i++) {
      commit("add", {
        id: i + 1,
        body:
          "The VPBank 4...8833 vua chi tieu 69,972VND ND:HAPROMART 94 LANG HA vao luc 18:39 12/10.",
        lastMessageSubject: "",
        lastMessageType: "sms",
        participants: ["VPBank"],
        timestamp: 1602505505266,
        unreadCount: 2
      });
    }
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
