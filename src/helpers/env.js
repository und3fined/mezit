/*
 * File: env.js
 * Project: mezit2.und3fined.com
 * File Created: 13 Oct 2020 14:12:20
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 13 Oct 2020 14:12:24
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
 */
export function isProd() {
  return process.env.NODE_ENV === "production";
}
