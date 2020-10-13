/*
 * File: message.js
 * Project: mezit2.und3fined.com
 * File Created: 13 Oct 2020 11:01:59
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 13 Oct 2020 11:02:03
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
 */
import { isProd } from "@/helpers/env";

export default function(mozMobileMessage) {
  return store => {
    if (!mozMobileMessage && !isProd()) return;

    mozMobileMessage.addEventListener("received", e =>
      store.commit("message/received", e)
    );
    mozMobileMessage.addEventListener("sending", e =>
      store.commit("message/sending", e)
    );
    mozMobileMessage.addEventListener("sent", e =>
      store.commit("message/sent", e)
    );
    mozMobileMessage.addEventListener("failed", e =>
      store.commit("message/failed", e)
    );
    mozMobileMessage.addEventListener("readsuccess", e =>
      store.commit("message/readsuccess", e)
    );
    mozMobileMessage.addEventListener("deliverysuccess", e =>
      store.commit("message/deliverysuccess", e)
    );
    mozMobileMessage.addEventListener("deleted", e =>
      store.commit("message/deleted", e)
    );
  };
}
