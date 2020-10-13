/*
 * File: manager.js
 * Project: mezit.und3fined.com
 * File Created: 12 Oct 2020 11:09:03
 * Author: und3fined (me@und3fined.com)
 * -----
 * Last Modified: 12 Oct 2020 11:09:07
 * Modified By: me@und3fined.com (me@und3fined.com>)
 * -----
 * Copyright (c) 2020 und3fined.com
 */
const connect = require("node-firefox-connect");
const installer = require("node-firefox-install-app");
const { execSync } = require("child_process");
const { resolve } = require("path");
const { writeFileSync, readFileSync, existsSync } = require("fs");

const applicationPath = resolve(__dirname, "../application");
const appIDLocked = resolve(__dirname, "appid.locked");
const DEBUGGER_PORT = process.env["DEBUGGER_PORT"] || 6000;
const libCache = { manager: null, client: null };

function generateAppID(id) {
  return `app://${id}/manifest.webapp`;
}

function appManager() {
  return new Promise(async (resolve, reject) => {
    if (libCache.manager) {
      resolve(libCache.manager);
      return;
    }
    execSync(
      `adb forward tcp:${DEBUGGER_PORT} localfilesystem:/data/local/debugger-socket`
    );
    let client = await connect(DEBUGGER_PORT);
    client.getWebapps((err, manager) => {
      if (err) reject(err);
      else {
        libCache.manager = manager;
        libCache.client = client;
        resolve(manager);
      }
    });
  });
}

// main
(async () => {
  let appId = null;
  if (existsSync(appIDLocked)) {
    appId = readFileSync(appIDLocked, { encoding: "utf-8" });
  }

  let manager = await appManager();

  if (appId) {
    appId = generateAppID(appId);
    manager.uninstall(appId, (err, apps) => {
      if (err) console.error(err);
      else console.info("Remove exists app: DONE.");
    });
  }

  try {
    appId = await installer({
      appPath: applicationPath,
      client: libCache.client
    });
    writeFileSync(appIDLocked, appId);
    console.info(`App installed with id ${appId}.`);

    await new Promise((resolve, reject) => {
      manager.launch(generateAppID(appId), function(err) {
        if (err) reject(err);
        resolve();
      });
    });
  } catch (err) {
    console.error(err);
  }

  process.exit(0);
})();
