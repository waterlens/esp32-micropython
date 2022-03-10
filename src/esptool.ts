import { exec } from "child_process";
import * as vscode from "vscode";
import { satisfies } from "semver";

export class ESPToolWrapper {
  private extPrefix = "ESP32 MicroPython";
  private prefix = "esptool wrapper ";
  private pythonName = ["python", "python3", "py"];
  private esptoolInstalled = false;

  install() {}

  private getEsptoolCommand(py: string, arg: string[]): string {
    return `${py} -m esptool ` + arg.join(" ");
  }

  private async checkEsptoolInstalled(py: string): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      exec(
        this.getEsptoolCommand(py, ["-h"]),
        (error: any, stdout: string, stderr: string) => {
          if (error) {
            reject(false);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  private async checkPyVersionOK(version: string): Promise<string> {
    const tmp: Promise<string>[] = this.pythonName.map((name) => {
      return new Promise((resolve, reject) => {
        exec(
          `${name} -c "import platform; print(platform.python_version())"`,
          (error: any, stdout: any, stderr: any) => {
            if (error || !satisfies(stdout, version)) {
              console.log(this.prefix + `try ${name} failed`);
              reject(error);
            }
            resolve(name);
          }
        );
      });
    });
    const availablePythonName = await Promise.any(tmp);
    console.log(this.prefix + `available python is ${availablePythonName}`);
    return availablePythonName;
  }

  check() {
    this.checkPyVersionOK("3.x")
      .then((py) => {
        this.checkEsptoolInstalled(py).then((installed) => {
          if (!installed) {
            console.log(this.prefix + "esptool not installed");
          }
        });
      })
      .catch((err) => {});
  }

  flash(path: string, firmware: string) {}
  erase(path: string) {}
}
