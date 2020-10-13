import Vue from "vue";
import VueRouter from "vue-router";

import Thread from "@/views/Thread.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "Thread",
    component: Thread
  },
  {
    path: "/message/:id",
    name: "Message",
    component: () =>
      import(/* webpackChunkName: "message" */ "../views/Message.vue")
  },
  {
    path: "/setting",
    name: "Setting",
    component: () =>
      import(/* webpackChunkName: "setting" */ "../views/Setting.vue")
  },
  {
    path: "/about",
    name: "About",
    component: () =>
      import(/* webpackChunkName: "about" */ "../views/About.vue")
  }
];

const router = new VueRouter({
  routes
});

export default router;
