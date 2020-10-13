<!--
 * File: header.vue
 * Project: mezit2.und3fined.com
 * File Created: 13 Oct 2020 14:36:13
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 13 Oct 2020 14:41:24
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
--->
<template>
  <h1
    class="header bg-blue-500 h-6 text-gray-200 px-2 flex flex-row justify-between mt-6 top-0 left-0 fixed w-full"
  >
    <span class="font-semibold">{{ title }}</span>
    <span class="view-number text-sm leading-6" v-if="!!hint">{{ hint }} </span>
  </h1>
</template>

<script>
export default {
  name: "Header",
  props: {
    title: String,
    hint: String
  }
};
</script>
