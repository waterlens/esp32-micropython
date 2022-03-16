import { exec, spawn } from "child_process";
import * as vscode from "vscode";
import { satisfies } from "semver";
import { PortUtil } from "./port";
import { promisify } from "util";
import { Message } from "./message";
import { ExternalCommand } from "./externalCmd";

export class ESPToolWrapper {
  private static readonly exec = promisify(exec);
  private static readonly spawn = promisify(spawn);
  private readonly outputChannel = vscode.window.createOutputChannel("ESPTool");
  private static readonly message = new Message("esptool wrapper");
  private static readonly cmd = new ExternalCommand(this.message);

  async check() {
    return ESPToolWrapper.cmd.checkAndPrompt("esptool");
  }

  async install() {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Installing esptool.py",
        cancellable: false,
      },
      async (progress, token) => {
        const pyPrefix = await ESPToolWrapper.cmd.checkPython();
        const installed = await ExternalCommand.checkPythonModuleInstalled(
          pyPrefix,
          "esptool"
        );
        if (!installed) {
          try {
            await ESPToolWrapper.exec(
              ExternalCommand.getFullCommandString(pyPrefix, "pip", [
                "install",
                "esptool",
              ])
            );
            ESPToolWrapper.message.showInfo(
              "install esptool.py success",
              "Install esptool.py success."
            );
          } catch (error) {
            ESPToolWrapper.message.showError(
              "can't install esptool.py",
              "Can't install esptool.py: " + error
            );
          }
        }
        progress.report({ increment: 100 });
        return;
      }
    );
  }

  async uninstall() {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Uninstalling esptool.py",
        cancellable: false,
      },
      async (progress, token) => {
        const pyPrefix = await ESPToolWrapper.cmd.checkPython();
        const installed = await ExternalCommand.checkPythonModuleInstalled(
          pyPrefix,
          "esptool"
        );
        if (installed) {
          try {
            await ESPToolWrapper.exec(
              ExternalCommand.getFullCommandString(pyPrefix, "pip", [
                "uninstall",
                "esptool",
                "-y",
              ])
            );
            ESPToolWrapper.message.showInfo(
              "uninstall esptool.py success",
              "Uninstall esptool.py success."
            );
          } catch (error) {
            ESPToolWrapper.message.showError(
              "can't uninstall esptool.py",
              "Can't uninstall esptool.py: " + error
            );
          }
        }
        progress.report({ increment: 100 });
        return;
      }
    );
  }

  private portPick() {
    return vscode.window.showQuickPick(PortUtil.listAsStringArray());
  }

  private firmwarePick() {
    const options: vscode.OpenDialogOptions = {
      canSelectMany: false,
      openLabel: "Select a firmware file",
      canSelectFiles: true,
      canSelectFolders: false,
    };
    return vscode.window.showOpenDialog(options);
  }

  async program(port?: string, firmware?: string) {
    const selected = port || (await this.portPick());
    if (!selected) {
      ESPToolWrapper.message.showError("no port selected", "No port selected.");
      return;
    }

    let path: string;
    if (!firmware) {
      let picked = await this.firmwarePick();
      if (!picked || picked.length === 0) {
        ESPToolWrapper.message.showError(
          "no firmware selected",
          "No firmware selected."
        );
        return;
      }
      path = picked[0].fsPath;
    } else {
      path = firmware!;
    }

    const pyPrefix = await ESPToolWrapper.cmd.getPythonPrefix("3.x");
    const installed = await ESPToolWrapper.cmd.checkAndPrompt("esptool", true);
    if (!installed) {
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        cancellable: false,
        title: `Programing ${selected} ...`,
      },
      async (progress, token) => {
        return new Promise<void>((resolve, reject) => {
          this.outputChannel.clear();
          this.outputChannel.show();

          console.log("program esp32 on port " + selected);
          const esptool = spawn(
            pyPrefix,
            ExternalCommand.getPythonModuleOptions("esptool", [
              "--chip",
              "esp32",
              "--port",
              selected,
              "--baud",
              "460800",
              "write_flash",
              "-z",
              "0x1000",
              path,
            ]),
            { windowsHide: true }
          )
            .on("error", (error) => {
              ESPToolWrapper.message.showError(
                "esptool.py error",
                error.toString()
              );
            })
            .on("exit", () => {
              ESPToolWrapper.message.showInfo(
                "program esp32 success",
                "Operation done successfully."
              );
              progress.report({ increment: 100, message: "Programming done" });
              resolve();
            });

          esptool.stdout.on("data", (data) => {
            this.outputChannel.append(data.toString());
            console.log(data);
          });
          esptool.stderr.on("data", (data) => {
            this.outputChannel.append(data.toString());
            console.log(data);
          });
        });
      }
    );
  }

  async erase(port?: string) {
    const selected = port || (await this.portPick());
    if (!selected) {
      ESPToolWrapper.message.showError("no port selected", "No port selected.");
      return;
    }

    const pyPrefix = await ESPToolWrapper.cmd.getPythonPrefix("3.x");
    const installed = await ESPToolWrapper.cmd.checkAndPrompt("esptool", true);
    if (!installed) {
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        cancellable: false,
        title: `Erasing ${selected} ...`,
      },
      async (progress, token) => {
        return new Promise<void>((resolve, reject) => {
          this.outputChannel.clear();
          this.outputChannel.show();

          console.log("erase esp32 on port " + selected);
          const esptool = spawn(
            pyPrefix,
            ExternalCommand.getPythonModuleOptions("esptool", [
              "--chip",
              "esp32",
              "--port",
              selected,
              "erase_flash",
            ]),
            { windowsHide: true }
          )
            .on("error", (error) => {
              ESPToolWrapper.message.showError(
                "esptool.py error",
                error.toString()
              );
            })
            .on("exit", () => {
              ESPToolWrapper.message.showInfo(
                "erase esp32 success",
                "Operation done successfully."
              );
              progress.report({ increment: 100, message: "Erasing done" });
              resolve();
            });

          esptool.stdout.on("data", (data) => {
            this.outputChannel.append(data.toString());
            console.log(data);
          });
          esptool.stderr.on("data", (data) => {
            this.outputChannel.append(data.toString());
            console.log(data);
          });
        });
      }
    );
  }
}
