import { exec, spawn } from "child_process";
import * as vscode from "vscode";
import { satisfies } from "semver";
import { PortUtil } from "./port";
import { promisify } from "util";

export class ESPToolWrapper {
  private static extPrefix = "ESP32 MicroPython";
  private static consoleLogPrefix = "esptool wrapper ";
  private static pythonName = ["python", "python3", "py"];
  private outputChannel = vscode.window.createOutputChannel("ESPTool");
  private static exec = promisify(exec);
  private static spawn = promisify(spawn);

  private static showInfo(log: string, msg: string) {
    console.log(this.consoleLogPrefix + log);
    vscode.window.showInformationMessage(this.newMessageWithExtName(msg));
  }

  private static showError(error: string, msg: string) {
    console.error(this.consoleLogPrefix + error);
    vscode.window.showErrorMessage(this.newMessageWithExtName(msg));
  }

  private static showWarning(warning: string, msg: string) {
    console.warn(this.consoleLogPrefix + warning);
    vscode.window.showWarningMessage(this.newMessageWithExtName(msg));
  }

  private static newMessageWithExtName(message: string): string {
    return `${this.extPrefix}: ${message}`;
  }

  private static getESPToolArgs(arg: string[]): string[] {
    return ["-m", "esptool"].concat(arg);
  }

  private static getESPToolCommandArray(py: string, arg: string[]): string[] {
    return [py].concat(ESPToolWrapper.getESPToolArgs(arg)).concat(arg);
  }

  private static getPipCommandArray(py: string, arg: string[]): string[] {
    return [py, "-m", "pip"].concat(arg);
  }

  private static getESPToolCommand(py: string, arg: string[]): string {
    return this.getESPToolCommandArray(py, arg).join(" ");
  }

  private static getPipCommand(py: string, arg: string[]): string {
    return this.getPipCommandArray(py, arg).join(" ");
  }

  private async checkESPToolInstalled(py: string) {
    return new Promise((resolve, reject) => {
      ESPToolWrapper.exec(ESPToolWrapper.getESPToolCommand(py, ["-h"]))
        .then((_) => resolve(true))
        .catch((_) => resolve(false));
    });
  }

  private async getPythonPrefix(version: string) {
    const tmp = ESPToolWrapper.pythonName.map((name) =>
      (async function () {
        try {
          const result = await ESPToolWrapper.exec(
            `${name} -c "import platform; print(platform.python_version())"`
          );
          if (satisfies(result.stdout, version)) {
            return name;
          } else {
            throw new Error("python version not satisfied");
          }
        } catch (_) {
          throw _;
        }
      })()
    );
    const availablePythonName = await Promise.any(tmp);
    console.log(
      ESPToolWrapper.consoleLogPrefix +
        `available python is ${availablePythonName}`
    );
    return availablePythonName;
  }

  private async checkPython() {
    try {
      return this.getPythonPrefix("3.x");
    } catch (error) {
      ESPToolWrapper.showError(
        "python not found",
        "Please install Python 3.x."
      );
      throw error;
    }
  }

  async check(silent?: boolean) {
    try {
      const pyPrefix = await this.checkPython();
      const installed = await this.checkESPToolInstalled(pyPrefix);
      if (installed) {
        if (!(silent && silent === true)) {
          ESPToolWrapper.showInfo(
            "esptool.py has been installed",
            "esptool.py has been installed."
          );
        }
      } else {
        ESPToolWrapper.showWarning(
          "esptool.py has not been installed",
          "esptool.py has not been installed."
        );
      }
      return installed;
    } catch (error) {
      return false;
    }
  }

  async install() {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Installing esptool.py",
        cancellable: false,
      },
      async (progress, token) => {
        const pyPrefix = await this.checkPython();
        const installed = await this.checkESPToolInstalled(pyPrefix);
        if (!installed) {
          try {
            await ESPToolWrapper.exec(
              ESPToolWrapper.getPipCommand(pyPrefix, ["install", "esptool"])
            );
            ESPToolWrapper.showInfo(
              "install esptool.py success",
              "Install esptool.py success."
            );
          } catch (error) {
            ESPToolWrapper.showError(
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
        const pyPrefix = await this.checkPython();
        const installed = await this.checkESPToolInstalled(pyPrefix);
        if (installed) {
          try {
            await ESPToolWrapper.exec(
              ESPToolWrapper.getPipCommand(pyPrefix, [
                "uninstall",
                "esptool",
                "-y",
              ])
            );
            ESPToolWrapper.showInfo(
              "uninstall esptool.py success",
              "Uninstall esptool.py success."
            );
          } catch (error) {
            ESPToolWrapper.showError(
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
      ESPToolWrapper.showError("no port selected", "No port selected.");
      return;
    }

    let path: string;
    if (!firmware) {
      let picked = await this.firmwarePick();
      if (!picked || picked.length === 0) {
        ESPToolWrapper.showError(
          "no firmware selected",
          "No firmware selected."
        );
        return;
      }
      path = picked[0].fsPath;
    } else {
      path = firmware!;
    }

    const pyPrefix = await this.getPythonPrefix("3.x");
    const installed = await this.check(true);
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
            ESPToolWrapper.getESPToolArgs([
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
              ESPToolWrapper.showError("esptool.py error", error.toString());
            })
            .on("exit", () => {
              ESPToolWrapper.showInfo(
                "program esp32 success",
                "Operation done successfully."
              );
              progress.report({ increment: 100, message: "Program done" });
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
      ESPToolWrapper.showError("no port selected", "No port selected.");
      return;
    }

    const pyPrefix = await this.getPythonPrefix("3.x");
    const installed = await this.check(true);
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
            ESPToolWrapper.getESPToolArgs([
              "--chip",
              "esp32",
              "--port",
              selected,
              "erase_flash",
            ]),
            { windowsHide: true }
          )
            .on("error", (error) => {
              ESPToolWrapper.showError("esptool.py error", error.toString());
            })
            .on("exit", () => {
              ESPToolWrapper.showInfo(
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
