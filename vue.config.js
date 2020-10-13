/*
 * File: vue.config.js
 * Project: mezit2.und3fined.com
 * File Created: 13 Oct 2020 00:25:05
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 13 Oct 2020 00:25:15
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
 */
module.exports = {
  outputDir: "application",
  assetsDir: "assets",
  productionSourceMap: false,

  configureWebpack: config => {
    config.mode =
      process.env.NODE_ENV === "production" ? "production" : "development";
  },
  chainWebpack: config => {
    config.plugin("html").tap(args => {
      args[0].title = "Mezit";
      args[0].theme_color = process.env.COLOR_PRIMARY;

      return args;
    });
  }
};
