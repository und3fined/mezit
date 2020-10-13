<template>
  <div id="mezit-app" class="container">
    <div class="flex flex-col bg-gray-100 antialiased relative">
      <StatusBar />
      <div class="flex-shrink-0">
        <router-view />
      </div>
      <Softkey />
    </div>
  </div>
</template>
<script>
import StatusBar from "@/components/ui/StatusBar";
import Softkey from "@/components/common/Softkey";

export default {
  components: {
    StatusBar,
    Softkey
  }
};
</script>

<style>
#mezit-app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
