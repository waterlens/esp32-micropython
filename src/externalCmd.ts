import { exec } from "child_process";
import { satisfies } from "semver";
import { promisify } from "util";
import { Message } from "./message";

export class ExternalCommand {
  private static readonly pythonName = ["python", "python3", "py"];
  private static readonly exec = promisify(exec);
  private readonly message;
  constructor(message: Message) {
    this.message = message;
  }

  static getPythonModuleOptions(pymod: string, arg: string[]): string[] {
    return ["-m", pymod].concat(arg);
  }

  static getFullCommand(py: string, mod: string, arg: string[]): string[] {
    return [py].concat(ExternalCommand.getPythonModuleOptions(mod, arg));
  }

  static getFullCommandString(py: string, mod: string, arg: string[]): string {
    return this.getFullCommand(py, mod, arg).join(" ");
  }

  static async checkPythonModuleInstalled(py: string, mod: string) {
    return new Promise((resolve, reject) => {
      ExternalCommand.exec(
        ExternalCommand.getFullCommandString(py, mod, ["-h"])
      )
        .then((_) => resolve(true))
        .catch((_) => resolve(false));
    });
  }

  async getPythonPrefix(version: string) {
    const tmp = ExternalCommand.pythonName.map((name) =>
      (async function () {
        try {
          const result = await ExternalCommand.exec(
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
    this.message.consoleLog(`available python is ${availablePythonName}`);
    return availablePythonName;
  }

  async checkPython() {
    try {
      return this.getPythonPrefix("3.x");
    } catch (error) {
      this.message.showError("python not found", "Please install Python 3.x.");
      throw error;
    }
  }


  async checkAndPrompt(mod:string, silent?: boolean) {
    try {
      const pyPrefix = await this.checkPython();
      const installed = await ExternalCommand.checkPythonModuleInstalled(
        pyPrefix,
        mod,
      );
      if (installed) {
        if (!(silent && silent === true)) {
          this.message.showInfo(
            `${mod} has been installed`,
            `${mod} has been installed.`
          );
        }
      } else {
        this.message.showWarning(
          `${mod} has not been installed`,
          `${mod} has not been installed.`
        );
      }
      return installed;
    } catch (error) {
      return false;
    }
  }
}
