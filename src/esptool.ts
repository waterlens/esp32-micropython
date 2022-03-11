import { exec } from "child_process";
import * as vscode from "vscode";
import { satisfies } from "semver";

export class ESPToolWrapper {
  private extPrefix = "ESP32 MicroPython";
  private consoleLogPrefix = "esptool wrapper ";
  private pythonName = ["python", "python3", "py"];

  private showInfo(log: string, msg: string) {
    console.log(this.consoleLogPrefix + log);
    vscode.window.showInformationMessage(this.newMessageWithExtName(msg));
  }

  private showError(error: string, msg: string) {
    console.error(this.consoleLogPrefix + error);
    vscode.window.showErrorMessage(this.newMessageWithExtName(msg));
  }

  private showWarning(warning: string, msg: string) {
    console.warn(this.consoleLogPrefix + warning);
    vscode.window.showWarningMessage(this.newMessageWithExtName(msg));
  }

  private newMessageWithExtName(message: string): string {
    return `${this.extPrefix}: ${message}`;
  }

  private getESPToolCommand(py: string, arg: string[]): string {
    return `${py} -m esptool ` + arg.join(" ");
  }

  private getPipCommand(py: string, arg: string[]): string {
    return `${py} -m pip ` + arg.join(" ");
  }

  private checkESPToolInstalled(py: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      exec(
        this.getESPToolCommand(py, ["-h"]),
        (error: any, stdout: string, stderr: string) => {
          if (error) {
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  private async getPythonPrefix(version: string): Promise<string> {
    const tmp: Promise<string>[] = this.pythonName.map((name) => {
      return new Promise((resolve, reject) => {
        exec(
          `${name} -c "import platform; print(platform.python_version())"`,
          (error: any, stdout: any, stderr: any) => {
            if (error || !satisfies(stdout, version)) {
              console.log(this.consoleLogPrefix + `try ${name} failed`);
              reject(error);
            }
            resolve(name);
          }
        );
      });
    });
    const availablePythonName = await Promise.any(tmp);
    console.log(
      this.consoleLogPrefix + `available python is ${availablePythonName}`
    );
    return availablePythonName;
  }

  private async checkPython(cb: (value: string) => void) {
    const isPythonInstalled = this.getPythonPrefix("3.x");
    isPythonInstalled.then(cb);
    isPythonInstalled.catch((error) => {
      this.showError("python not found", "please install Python 3.x.");
    });
  }

  async check() {
    const cb = (prefix: string) => {
      this.checkESPToolInstalled(prefix).then((installed) => {
        if (installed) {
          this.showInfo(
            "esptool.py has been installed",
            "esptool.py has been installed."
          );
        } else {
          this.showWarning(
            "esptool.py has not been installed",
            "esptool.py has not been installed."
          );
        }
      });
    };
    this.checkPython(cb);
  }

  async install() {
    const cb = (prefix: string) => {
      this.checkESPToolInstalled(prefix).then((installed) => {
        if (!installed) {
          exec(
            this.getPipCommand(prefix, ["install", "esptool"]),
            (error: any, stdout: string, stderr: string) => {
              if (error) {
                this.showError(
                  "can't install esptool.py",
                  "can't install esptool.py: " + stderr
                );
              } else {
                this.showInfo(
                  "install esptool.py success",
                  "install esptool.py success."
                );
              }
            }
          );
        }
      });
    };
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Installing esptool.py",
        cancellable: false,
      },
      async (progress, token) => {
        await this.checkPython(cb);
        progress.report({ increment: 100 });
        return new Promise<void>((resolve, reject) => {
          resolve();
        });
      }
    );
  }

  async uninstall() {
    const cb = (prefix: string) => {
      this.checkESPToolInstalled(prefix).then((installed) => {
        if (installed) {
          exec(
            this.getPipCommand(prefix, ["uninstall", "esptool", "-y"]),
            (error: any, stdout: string, stderr: string) => {
              if (error) {
                this.showError(
                  "can't uninstall esptool.py",
                  "can't uninstall esptool.py: " + stderr
                );
              } else {
                this.showInfo(
                  "uninstall esptool.py success",
                  "uninstall esptool.py success."
                );
              }
            }
          );
        }
      });
    };
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Uninstalling esptool.py",
        cancellable: false,
      },
      async (progress, token) => {
        await this.checkPython(cb);
        progress.report({ increment: 100 });
        return new Promise<void>((resolve, reject) => {
          resolve();
        });
      }
    );
  }

  flash(path: string, firmware: string) {}
  erase(path: string) {}
}
