<template>
  <div class="home h-screen overflow-hidden">
    <UIHeader title="Messages" :hint="messageNumber" />
    <div id="no-result-message" v-if="totalItem === 0">
      <h2 data-l10n-id="noMessages-title">No messages</h2>
      <p data-l10n-id="noMessages-text">Press New to start communicating.</p>
    </div>
    <div class="threads-content mt-12" v-if="totalItem !== 0">
      <MessageList :messages="messages" :currentIndex="currentIndex" />
    </div>
    <div
      class="soft-key w-full h-6 fixed bottom-0 left-0 flex justify-between bg-blue-100"
    >
      <SvgIcon icon="pencil-alt" />
      <SvgIcon icon="cursor-click" />
      <SvgIcon icon="dots-vertical" />
    </div>
  </div>
</template>

<script>
import UIHeader from "@/components/ui/Header";
import SvgIcon from "@/components/ui/SvgIcon";

import MessageList from "@/components/message/List";

export default {
  name: "Thread",

  components: {
    UIHeader,
    SvgIcon,
    MessageList
  },

  data: () => ({
    currentIndex: 0
  }),

  created() {
    this.$store.dispatch("message/getThreads");
  },

  computed: {
    totalItem() {
      return this.$store.getters["message/list"].length;
    },
    messageNumber() {
      return `${this.currentIndex}/${this.totalItem}`;
    },
    messages() {
      return this.$store.getters["message/list"];
    }
  },

  methods: {
    onSelectIndex(index) {
      this.currentItem = index + 1;
    }
  }
};
</script>
<style>
.threads-content {
  height: calc(100vh - 48px - 24px);
  @apply overflow-auto;
}
</style>
