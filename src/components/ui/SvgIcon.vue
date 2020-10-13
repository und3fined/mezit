<script>
export default {
  name: "svg-icon",
  props: {
    icon: {
      type: String,
      default: null
    },
    type: {
      type: String,
      default: "solid"
    },
    hasFill: {
      type: Boolean,
      default: false
    },
    growByHeight: {
      type: Boolean,
      default: true
    }
  },
  mounted() {
    if (this.$el.firstElementChild.nodeName === "svg") {
      const svgElement = this.$el.firstElementChild;
      svgElement.classList.add("svg-class");
    }
  }
};
</script>

<template>
  <span
    v-html="require(`!html-loader!../../assets/heroicons/${type}/${icon}.svg`)"
    class="svg-container"
  ></span>
</template>

<style scoped>
.svg-container {
  display: inline-flex;
}
</style>
