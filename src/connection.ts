import { exec, spawn } from "child_process";
import { open, read, writeFile } from "fs";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { promisify } from "util";
import * as vscode from "vscode";
import { ExternalCommand } from "./extCmd";
import { Message } from "./message";
import { UI } from "./ui";
import { WifiUtil } from "./wifi";

export class ConnectionUtil {
  private static readonly message = new Message("connection util");
  private static readonly exec = promisify(exec);
  private static readonly spawn = promisify(spawn);
  private static readonly cmd = new ExternalCommand(this.message);
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  registerAllCommands() {
    return [
      vscode.commands.registerCommand("emp.remote.connect", () =>
        this.remoteConnectWLAN()
      ),
    ];
  }

  register() {
    for (const cmd of this.registerAllCommands()) {
      this.context.subscriptions.push(cmd);
    }
  }

  async replaceConnectScriptStub(s: string) {
    try {
      const path = this.context.asAbsolutePath("misc/connect.py");
      const tmpPath = this.context.asAbsolutePath("misc/_connect.py");
      const content = await readFile(path, { encoding: "utf-8" });
      await writeFile(
        tmpPath,
        content.replace(/"""__##stub##__"""/g, `"""${s}"""`),
        () => {}
      );
    } catch (error) {
      ConnectionUtil.message.showError(
        "can't open code snippet for connecting",
        "Can't open code snippet for connecting: " + error
      );
    }
  }

  async getRemoteWLANState(port?: string): Promise<{
    status?: number;
    connected?: boolean;
    ip?: string;
    subnet?: string;
    gateway?: string;
    dns?: string;
  }> {
    try {
      const state = await ConnectionUtil.exec(
        [
          "mpremote",
          "connect",
          port,
          "run",
          this.context.asAbsolutePath("misc/state.py"),
        ].join(" ")
      );
      const res = JSON.parse(state.stdout);
      return {
        status: res[0],
        connected: res[1],
        ip: res[2][0],
        subnet: res[2][1],
        gateway: res[2][2],
        dns: res[2][3],
      };
    } catch (error) {
      ConnectionUtil.message.showError(
        "can't get the WLAN status of remote device",
        "Can't get the WLAN status of remote device: " + error
      );
      return {};
    }
  }

  async remoteConnectWLAN(port?: string) {
    const python = await ConnectionUtil.cmd.checkPythonPath();
    const installed = await ConnectionUtil.cmd.checkAndPrompt("mpremote", true);
    // if (!installed) {
    //  return;
    // }
    const selected = port || (await UI.portPick());
    if (!selected) {
      ConnectionUtil.message.showError("no port selected", "No port selected.");
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        cancellable: false,
        title: `Remote connection`,
      },
      async (progress, token) => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            progress.report({ message: "Scanning AP ..." });
            const res = await ConnectionUtil.exec(
              /*
            ExternalCommand.getFullCommandString(python, "mpremote", [
              "connect",
              selected,
              "run",
              this.context.asAbsolutePath("misc/scan.py"),
            ])*/ [
                "mpremote",
                "connect",
                selected,
                "run",
                this.context.asAbsolutePath("misc/scan.py"),
              ].join(" ")
            );

            const wl = new WifiUtil();

            wl.addFromJSON(res.stdout);
            wl.sortByRSSI();
            wl.removeHidden();
            wl.removeEmpty();

            progress.report({ message: "Select an AP ..." });
            const pickedAP = await UI.apPick(wl);
            if (!pickedAP) {
              return;
            }

            progress.report({ message: "Input the password ..." });
            const pass = await UI.passwordInput();
            if (!pass) {
              return;
            }

            const json = JSON.stringify([pickedAP, pass]);
            this.replaceConnectScriptStub(json);

            progress.report({ message: "Try connecting ..." });
            await ConnectionUtil.exec(
              [
                "mpremote",
                "connect",
                selected,
                "run",
                this.context.asAbsolutePath("misc/_connect.py"),
              ].join(" ")
            );

            setTimeout(async () => {
              const status = await this.getRemoteWLANState(selected);
              if (status.connected === true) {
                ConnectionUtil.message.showInfo(
                  "connected",
                  "Remote device has connected to the WLAN: " + pickedAP
                );
              } else {
                ConnectionUtil.message.showError(
                  "try failed",
                  "Remote device failed to connect to the WLAN: " + pickedAP
                );
              }
              resolve();
            }, 5000);
          } catch (error) {
            ConnectionUtil.message.showError(
              "can't scan wifi on device",
              "Can't scan wifi: " + error
            );
          }
        });
      }
    );
  }
}
