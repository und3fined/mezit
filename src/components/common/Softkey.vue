<!--
 * File: Statusbar.vue
 * Project: mezit2.und3fined.com
 * File Created: 13 Oct 2020 00:44:17
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 13 Oct 2020 00:44:20
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
-->
<template>
  <div class="flex-shrink softkey-placeholder">

  </div>
</template>
<script>
export default {
  mounted() {
    // document.addEventListener("keydown", this.handleKeyDown);
  },

  methods: {
    // handleKeyDown: e => {
    //   console.info("Key", e.key);
    // }
  }
};
</script>

<style type="css" scoped>
.softkey-placeholder {
  height: var(--statusbar-height);
  background-color: var(--header-background);
}
</style>
