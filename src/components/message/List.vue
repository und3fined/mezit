<!--
 * File: List.vue
 * Project: mezit2.und3fined.com
 * File Created: 13 Oct 2020 11:57:20
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 13 Oct 2020 11:57:23
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
 -->
<template>
  <ul id="messages-list" class="divide-y divide-gray-300">
    <li
      class="message-item text-left px-2 py-1"
      v-for="(message, index) in messages"
      :key="message.id"
      :class="{ 'bg-blue-200': currentIndex === index }"
    >
      <p class="message-header text-base flex">
        <span class="sender font-semibold tracking-wide">{{
          message.participants.join(", ")
        }}</span>
        <span
          class="rounded-full bg-blue-300 uppercase h-4 px-2 leading-4 text-xs font-bold"
          v-if="message.unreadCount"
          >{{ message.unreadCount }}</span
        >
        <span class="timer font-normal text-sm text-right leading-6 flex-1">{{
          message.timestamp | timeNormalizer
        }}</span>
      </p>
      <p
        class="message-body text-base h-10 overflow-hidden leading-5 whitespace-pre-line py-1"
        v-html="message.body"
      ></p>
    </li>
  </ul>
</template>
<script>
import { formatDistance, fromUnixTime } from "date-fns";

export default {
  props: {
    currentIndex: Number,
    messages: Array
  },

  mounted() {
    document.addEventListener("keydown", this.handleKeyDown);
  },

  beforeDestroy() {
    document.removeEventListener("keydown", this.handleKeyDown);
  },

  filters: {
    timeNormalizer: (val = 0) => {
      return formatDistance(fromUnixTime(parseInt(val / 1000, 10)), new Date());
    }
  },

  methods: {
    handleKeyDown: e => {
      console.info("Message list Key", e);
    }
  }
};
</script>
