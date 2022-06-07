import { exec, execSync, spawn } from "child_process";
import { Socket } from "dgram";
import { readdir, readFile, writeFile } from "fs/promises";
import path = require("path");
// <<<<<<< HEAD
import { promisify, TextEncoder } from "util";
// =======
import { openStdin } from "process";
// import { promisify } from "util";
// >>>>>>> main
import * as vscode from "vscode";
import { getIpAddr, getPassword } from "./connectionHandler";
import { ExternalCommand } from "./extCmd";
import { Message } from "./message";
import { TerminalWrapper } from "./terminal";
import { UI } from "./ui";
import { WifiUtil } from "./wifi";
import { TEMP_FILE_DIR_PATH } from "./config";
import { resolve } from "path";

// Here remote stands for serial connected device
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
      vscode.commands.registerCommand("emp.remote.wlan.connect", () =>
        this.remoteConnectWLAN()
      ),
      vscode.commands.registerCommand("emp.remote.webrepl.setup", () => {
        this.setupRemoteWebRepl();
      }),
      vscode.commands.registerCommand("emp.remote.serial.execute", () => {
        this.execCurrentScriptRemotely();
      }),
      vscode.commands.registerCommand("emp.remote.webrepl.execute", () => {
// <<<<<<< HEAD
          this.execCurrentScriptViaNetwork();
      }),
      vscode.commands.registerCommand("emp.port.download_file", (fileName, port) => {
        this.downloadFileViaSerialPort(fileName, port);
      }),
      vscode.commands.registerCommand("emp.port.create_file", (port) => {
        this.createFileAndBind(port);
      }),
      vscode.commands.registerCommand("emp.port.webrepl_download_file", (fileName, ip) => {
          this.downloadFileViaWebrepl(fileName, ip);
      }),
      vscode.commands.registerCommand("emp.port.webrepl_create_file", (ip) => {
        this.createFileAndBindToWebrepl(ip);
// =======
        // this.execCurrentScriptViaNetwork();
// >>>>>>> main
      }),
    ];
  }

  register() {
    for (const cmd of this.registerAllCommands()) {
      this.context.subscriptions.push(cmd);
    }
  }

  async createFileAndBindToWebrepl(ip: string) {
     const fileName = await vscode.window.showInputBox({
      prompt: "Enter the New File Name",
      password: false,
    });
    if (fileName !== undefined) {
      const newFilePath  = vscode.Uri.file(TEMP_FILE_DIR_PATH + fileName);
      vscode.workspace.fs.writeFile(newFilePath, new TextEncoder().encode("# this is a file created by esp32-micropython!\n")).then(() => {
        vscode.workspace.openTextDocument(newFilePath).then((doc) => {
          console.debug("showing file " + doc);
          vscode.window.showTextDocument(doc);
          vscode.workspace.onDidSaveTextDocument((e) => {
              console.debug("saving file " + e.fileName);
              if (e.fileName === TEMP_FILE_DIR_PATH + fileName) {
                  this.uploadFileViaWebrepl(fileName, ip);
                  new Promise( resolve => {
                    setTimeout(resolve, 3000);
                  }).then(() => {
                    vscode.commands.executeCommand("emp.web_port.refresh");
                  });
              }
          });
        });
      });
    } else {
      vscode.window.showErrorMessage("Please Enter a Valid File Name!");
    }
  }

  async createFileAndBind(port: string) {
    const fileName = await vscode.window.showInputBox({
      prompt: "Enter the New File Name",
      password: false,
    });
    if (fileName !== undefined) {
      const newFilePath  = vscode.Uri.file(TEMP_FILE_DIR_PATH + fileName);
      vscode.workspace.fs.writeFile(newFilePath, new TextEncoder().encode("# this is a file created by esp32-micropython!\n")).then(() => {
        vscode.workspace.openTextDocument(newFilePath).then((doc) => {
          console.debug("showing file " + doc);
          vscode.window.showTextDocument(doc);
          vscode.workspace.onDidSaveTextDocument((e) => {
              console.debug("saving file " + e.fileName);
              if (e.fileName === TEMP_FILE_DIR_PATH + fileName) {
                  this.uploadFileViaSerialPort(fileName, port);
                  new Promise( resolve => {
                    setTimeout(resolve, 500);
                  }).then(() => {
                    vscode.commands.executeCommand("emp.port.refresh");
                  });
              }
          });
        });
      });
    } else {
      vscode.window.showErrorMessage("Please Enter a Valid File Name!");
    }
  }

  async downloadFileViaWebrepl(fileName: string, ip: string) {
    const passwd = await getPassword(ip);
    const scriptPath = vscode.window.activeTextEditor?.document.fileName;
    const webreplCliPath = this.context.asAbsolutePath("webrepl/webrepl_cli.py");
    const cmd = [
        "python",
        webreplCliPath,
        "-p",
        passwd,
        ip + ":/" + fileName,
        TEMP_FILE_DIR_PATH + fileName,
    ].join(" ");
    TerminalWrapper.suspendWebDevice(ip);
    let handle = exec(cmd);
    console.log(cmd);
    TerminalWrapper.letOfficialTakeOver(ip, handle);
    handle.on("exit", () => {
        TerminalWrapper.letSelfMaintainedTakeOver(ip);
        TerminalWrapper.wakenWebDevice(ip, false);
        vscode.workspace.openTextDocument(TEMP_FILE_DIR_PATH + fileName).then((doc) => {
            console.debug("showing file " + doc);
            vscode.window.showTextDocument(doc);
            vscode.workspace.onDidSaveTextDocument((e) => {
                console.debug("saving file " + e.fileName);
                if (e.fileName === TEMP_FILE_DIR_PATH + fileName) {
                    this.uploadFileViaWebrepl(fileName, ip);
                }
            });
        });
    });
  }

  async uploadFileViaWebrepl(fileName: string, ip: string) {
    const passwd = await getPassword(ip);
    console.log("passwd: " + passwd);
    const scriptPath = vscode.window.activeTextEditor?.document.fileName;
    const webreplCliPath = this.context.asAbsolutePath("webrepl/webrepl_cli.py");
    const cmd = [
        "python",
        webreplCliPath,
        "-p",
        passwd,
        TEMP_FILE_DIR_PATH + fileName,
        ip + ":/" + fileName,
    ].join(" ");
    TerminalWrapper.suspendWebDevice(ip);
    let handle = exec(cmd);
    console.log(cmd);
    TerminalWrapper.letOfficialTakeOver(ip, handle);
    handle.on("exit", () => {
        TerminalWrapper.letSelfMaintainedTakeOver(ip);
        TerminalWrapper.wakenWebDevice(ip, false);
        // vscode.workspace.openTextDocument("/tmp/esp32-micropython/" + fileName).then((doc) => {
        //     console.debug("showing file " + doc);
        //     vscode.window.showTextDocument(doc);
        //     vscode.workspace.onDidSaveTextDocument((e) => {
        //         console.debug("saving file " + e.fileName);
        //         if (e.fileName === "/tmp/esp32-micropython/" + fileName) {
        //             this.uploadFileViaWebrepl(fileName, ip);
        //         }
        //     });
        // });
    });
  }

  async downloadFileViaSerialPort(fileName: string, port: string) {
    vscode.window.showInformationMessage("trying to download " + fileName);
    const cmd = [
        "mpremote",
        "connect",
        port,
        "cp",
        ":" + fileName,
        "/tmp/esp32-micropython/"
    ].join(" ");

    TerminalWrapper.suspendSerialDevice(port);
    let handle = exec(cmd);
    console.log(cmd);
    TerminalWrapper.letMpremoteTakeOver(port, handle);
    handle.on("exit", () => {
        TerminalWrapper.letSerialTakeOver(port); 
        TerminalWrapper.wakenSerialDevice(port, false);
        // vscode.commands.executeCommand("vscode.open", ["~/.cache/esp32-micropython/" + fileName])
        vscode.workspace.openTextDocument("/tmp/esp32-micropython/" + fileName).then((doc) => {
            console.debug("showing file " + doc);
            vscode.window.showTextDocument(doc);
            vscode.workspace.onDidSaveTextDocument((e) => {
                console.debug("saving file " + e.fileName);
                if (e.fileName === "/tmp/esp32-micropython/" + fileName) {
                    this.uploadFileViaSerialPort(fileName, port);
                }
            });
        });
    });
  }

  async uploadFileViaSerialPort(fileName: string, port: string) {
    vscode.window.showInformationMessage("trying to upload " + fileName);
    const cmd = [
        "mpremote",
        "connect",
        port,
        "cp",
        "/tmp/esp32-micropython/" + fileName,
        ":" + fileName,
    ].join(" ");

    TerminalWrapper.suspendSerialDevice(port);
    let handle = exec(cmd);
    console.log(cmd);
    TerminalWrapper.letMpremoteTakeOver(port, handle);
    handle.on("exit", () => {
        TerminalWrapper.letSerialTakeOver(port); 
        TerminalWrapper.wakenSerialDevice(port, false);
    });
  }

  async execCurrentScriptViaNetwork(ip?: string) {
    const selectedIp: string = ip || (await getIpAddr());
    const password = await getPassword();
    if (!selectedIp) {
      ConnectionUtil.message.showError(
        "no webrepl device selected",
        "No webrepl selected."
      );
      return;
    } else {
      this._execCurrentScriptViaNetwork(selectedIp, password);
    }
  }

  async _execCurrentScriptViaNetwork(ip: string, password: string) {
    const scriptPath = vscode.window.activeTextEditor?.document.fileName;
    const webreplCliPath = this.context.asAbsolutePath(
      "webrepl/webrepl_cli.py"
    );
    const cmd = [
      "python",
      webreplCliPath,
      "-p",
      password,
      scriptPath,
      ip + ":/__tmp__",
    ].join(" ");
    TerminalWrapper.suspendWebDevice(ip);
    let handle = exec(cmd);
    console.log(cmd);
    TerminalWrapper.letOfficialTakeOver(ip, handle);
    handle.on("exit", () => {
// <<<<<<< HEAD
        TerminalWrapper.letSelfMaintainedTakeOver(ip);
        TerminalWrapper.wakenWebDevice(ip, true);
// =======
    //   TerminalWrapper.letSelfMaintainedTakeOver(ip);
    //   TerminalWrapper.wakenWebDevice(ip);
// >>>>>>> main
    });
  }

  async execCurrentScriptRemotely(port?: string) {
    const selected = port || (await UI.portPick());
    if (!selected) {
      ConnectionUtil.message.showError("no port selected", "No port selected.");
      return;
    } else {
      this._execCurrentScriptRemotely(selected);
    }
  }

  async _execCurrentScriptRemotely(port: string) {
    const scriptPath = vscode.window.activeTextEditor?.document.fileName;
    const cmd = ["mpremote", "cp", scriptPath, ":/__tmp__"].join(" ");
    TerminalWrapper.suspendSerialDevice(port);
    let handle = exec(cmd);
    console.log(cmd);
    TerminalWrapper.letMpremoteTakeOver(port, handle);
    handle.on("exit", () => {
// <<<<<<< HEAD
        TerminalWrapper.letSerialTakeOver(port); 
        TerminalWrapper.wakenSerialDevice(port, true);
// =======
//       TerminalWrapper.letSerialTakeOver(port);
//       TerminalWrapper.wakenSerialDevice(port);
// >>>>>>> main
    });
  }

  fetchRemoteConfigFile(port: string): boolean {
    try {
      const scriptDirPath = this.context.asAbsolutePath("misc/to_remote");
      const cmd = [
        "mpremote",
        "connect",
        port,
        "fs",
        "cp",
        ":config.json",
        path.join(scriptDirPath, "config.json"),
      ].join(" ");
      console.log(cmd);
      execSync(cmd);
      return true;
    } catch (error) {
      return false;
    }
  }

  pushRemoteConfigFile(port: string): boolean {
    try {
      const scriptDirPath = this.context.asAbsolutePath("misc/to_remote");
      const cmd = [
        "mpremote",
        "connect",
        port,
        "fs",
        "cp",
        path.join(scriptDirPath, "config.json"),
        ":config.json",
      ].join(" ");
      console.log(cmd);
      execSync(cmd);
      return true;
    } catch (error) {
      return false;
    }
  }

  async syncAllBasicFilesWithRemote(port: string) {
    try {
      const scriptDirPath = this.context.asAbsolutePath("misc/to_remote");
      const files = await readdir(scriptDirPath);
      files.forEach((file, index) => {
        if (!file.startsWith("_")) {
          const cmd = [
            "mpremote",
            "connect",
            port,
            "fs",
            "cp",
            path.join(scriptDirPath, file),
            ":" + file,
          ].join(" ");
          execSync(cmd);
        }
      });
    } catch (error) {
      ConnectionUtil.message.showError(
        "can't sync files",
        "Can't sync files: " + error
      );
    }
  }

  async replaceConnectConfig(port: string, ap: string, pwd: string) {
    try {
      const path = this.context.asAbsolutePath(
        this.fetchRemoteConfigFile(port)
          ? "misc/to_remote/config.json"
          : "misc/_config.json"
      );
      const tmpPath = this.context.asAbsolutePath("misc/to_remote/config.json");
      const content = await readFile(path, { encoding: "utf-8" });

      let newContent = JSON.parse(content);
      newContent.wlan.ssid = ap;
      newContent.wlan.password = pwd;

      await writeFile(tmpPath, JSON.stringify(newContent));
    } catch (error) {
      ConnectionUtil.message.showError(
        "can't open code snippet for connecting",
        "Can't open code snippet for connecting: " + error
      );
    }
  }

  async replaceWebReplConfig(pwd: string) {
    try {
      const path = this.context.asAbsolutePath("misc/_webrepl_cfg.py");
      const tmpPath = this.context.asAbsolutePath("misc/to_remote/webrepl_cfg.py");
      const content = await readFile(path, { encoding: "utf-8" });
      await writeFile(
        tmpPath,
        content.replace(/"""__##stub##__"""/g, `"""${pwd}"""`)
      );
    } catch (error) {
      ConnectionUtil.message.showError(
        "can't open code snippet for connecting",
        "Can't open code snippet for connecting: " + error
      );
    }
  }

  async changeRemoteWebReplDaemonStatus(port: string, status: boolean) {
    try {
      const path = this.context.asAbsolutePath(
        this.fetchRemoteConfigFile(port)
          ? "misc/to_remote/config.json"
          : "misc/_config.json"
      );
      const tmpPath = this.context.asAbsolutePath("misc/to_remote/config.json");
      const content = await readFile(path, { encoding: "utf-8" });

      let newContent = JSON.parse(content);
      console.log(newContent);
      newContent.web_repl.enabled = status;

      await writeFile(tmpPath, JSON.stringify(newContent));
    } catch (error) {
      ConnectionUtil.message.showError(
        "can't change remote daemon status",
        "Can't change remote daemon status: " + error
      );
    }
  }

  async changeRemoteWlanDaemonStatus(port: string, status: boolean) {
    try {
      const path = this.context.asAbsolutePath(
        this.fetchRemoteConfigFile(port)
          ? "misc/to_remote/config.json"
          : "misc/_config.json"
      );
      const tmpPath = this.context.asAbsolutePath("misc/to_remote/config.json");
      const content = await readFile(path, { encoding: "utf-8" });

      let newContent = JSON.parse(content);
      newContent.wlan.enabled = status;

      await writeFile(tmpPath, JSON.stringify(newContent));
    } catch (error) {
      ConnectionUtil.message.showError(
        "can't change remote daemon status",
        "Can't change remote daemon status: " + error
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
          this.context.asAbsolutePath("misc/_state.py"),
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

  async setupRemoteWebRepl(port?: string) {
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
        title: `WebREPL setup ...`,
      },
      async (progress, token) => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            const pwd = await UI.webReplPasswordInput();
            if (!pwd) {
              resolve();
              return;
            }

            UI.confirmWebReplPassword(pwd);

            const enable = await UI.enableWebReplDaemon();

            await this.replaceWebReplConfig(pwd);
            await this.changeRemoteWebReplDaemonStatus(selected, enable);
            this.syncAllBasicFilesWithRemote(selected);
            resolve();
          } catch (error) {
            ConnectionUtil.message.showError(
              "can't set up WebREPL configure",
              "Can't set up WebREPL configure: " + error
            );
            resolve();
          }
        });
      }
    );
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
              this.context.asAbsolutePath("misc/_scan.py"),
            ])*/ [
                "mpremote",
                "connect",
                selected,
                "run",
                this.context.asAbsolutePath("misc/_scan.py"),
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
              resolve();
              return;
            }

            progress.report({ message: "Input the password ..." });
            const pwd = await UI.wlanPasswordInput();
            if (!pwd) {
              resolve();
              return;
            }

            await this.replaceConnectConfig(selected, pickedAP, pwd);
            this.pushRemoteConfigFile(selected);
            progress.report({ message: "Syncing files ..." });
            await this.syncAllBasicFilesWithRemote(selected);

            progress.report({ message: "Try connecting ..." });
            await ConnectionUtil.exec(
              [
                "mpremote",
                "connect",
                selected,
                "run",
                this.context.asAbsolutePath("misc/to_remote/connect.py"),
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
                resolve();
                return;
              }

              const enable = await UI.enableWLANDaemon();
              await this.changeRemoteWlanDaemonStatus(selected, enable);
              progress.report({ message: "Syncing files ..." });
              await this.syncAllBasicFilesWithRemote(selected);
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
