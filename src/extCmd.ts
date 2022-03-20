import { exec } from "child_process";
import { satisfies } from "semver";
import { promisify } from "util";
import { Message } from "./message";
import * as vscode from "vscode";

export class ExternalCommand {
  private static readonly python = "python";
  private static readonly exec = promisify(exec);
  private readonly message;
  constructor(message: Message) {
    this.message = message;
  }

  static getPythonModuleOptions(mod: string, arg: string[]): string[] {
    return ["-m", mod].concat(arg);
  }

  static getFullCommand(py: string[], mod: string, arg: string[]): string[] {
    return py.concat(ExternalCommand.getPythonModuleOptions(mod, arg));
  }

  static getFullCommandString(
    py: string[],
    mod: string,
    arg: string[]
  ): string {
    return this.getFullCommand(py, mod, arg).join(" ");
  }

  static splitCommandOptions(
    cmd: string[],
    options: string[]
  ): [string, string[]] {
    return [cmd[0], cmd.slice(1).concat(options)];
  }

  async installPythonModule(mod: string) { 
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Installing ${mod}`,
        cancellable: false,
      },
      async (progress, token) => {
        const python = await this.checkPythonPath();
        const installed = await ExternalCommand.checkPythonModuleInstalled(
          python,
          mod
        );
        if (!installed) {
          try {
            await ExternalCommand.exec(
              ExternalCommand.getFullCommandString(python, "pip", [
                "install",
                mod,
              ])
            );
            this.message.showInfo(
              `install ${mod} successfully`,
              `Install ${mod} successfully.`
            );
          } catch (error) {
            this.message.showError(
              `can't install ${mod}`,
              `Can't install ${mod}: ` + error
            );
          }
        }                      
        progress.report({ increment: 100 });
        return;
      }
    );
  }

  async promptInstallPythonModule(mod: string) {
    const choice = await vscode.window.showInformationMessage(
      `Do you want to install ${mod}?`,
      "Yes",
      "No"
    );
    if (choice !== "Yes") {
      return;
    }

    this.installPythonModule(mod);
  }

  static async checkPythonModuleInstalled(py: string[], mod: string) {
    return new Promise((resolve, reject) => {
      ExternalCommand.exec(
        ExternalCommand.getFullCommandString(py, mod, ["-h"])
      )
        .then((_) => resolve(true))
        .catch((_) => resolve(false));
    });
  }

  static getConfiguration(
    section?: string,
    document?: vscode.TextDocument
  ): vscode.WorkspaceConfiguration {
    if (document) {
      return vscode.workspace.getConfiguration(section, document.uri);
    } else {
      return vscode.workspace.getConfiguration(section);
    }
  }

  static async getPythonPath(
    document?: vscode.TextDocument
  ): Promise<string[]> {
    try {
      const extension = vscode.extensions.getExtension("ms-python.python");
      if (!extension) {
        return [ExternalCommand.python];
      }
      const usingNewInterpreterStorage =
        extension.packageJSON?.featureFlags?.usingNewInterpreterStorage;
      if (usingNewInterpreterStorage) {
        if (!extension.isActive) {
          await extension.activate();
        }
        const pythonPath = extension.exports.settings.getExecutionCommand(
          document?.uri
        );
        return pythonPath;
      } else {
        return [
          this.getConfiguration("python", document).get<string>("pythonPath") ||
            ExternalCommand.python,
        ];
      }
    } catch (error) {
      return [ExternalCommand.python];
    }
  }

  async checkPythonPath() {
    try {
      return ExternalCommand.getPythonPath();
    } catch (error) {
      this.message.showError("python not found", "Please install Python 3.x.");
      throw error;
    }
  }

  async checkAndPrompt(mod: string, silent?: boolean) {
    try {
      const python = await this.checkPythonPath();
      const installed = await ExternalCommand.checkPythonModuleInstalled(
        python,
        mod
      );
      if (installed) {
        if (silent !== true) {
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
        this.promptInstallPythonModule(mod);
      }
      return installed;
    } catch (error) {
      return false;
    }
  }
}
