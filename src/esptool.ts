import { spawn } from "child_process";
import * as vscode from "vscode";
import { Message } from "./message";
import { ExternalCommand } from "./extCmd";
import { UI } from "./ui";
import { PortItem } from "./portView";

export class ESPToolWrapper {
  private readonly outputChannel = vscode.window.createOutputChannel("ESPTool");
  private static readonly message = new Message("esptool wrapper");
  private static readonly cmd = new ExternalCommand(this.message);
  private context;

  registerAllCommands() {
    return [
      vscode.commands.registerCommand("emp.esptool.install", () =>
        this.install()
      ),
      vscode.commands.registerCommand("emp.esptool.check", () => this.check()),
      vscode.commands.registerCommand("emp.esptool.erase", (item?: PortItem) =>
        item ? this.erase(item.label) : this.erase()
      ),
      vscode.commands.registerCommand(
        "emp.esptool.program",
        (item?: PortItem) => (item ? this.program(item.label) : this.program())
      ),
    ];
  }

  register() {
    for (const cmd of this.registerAllCommands()) {
      this.context.subscriptions.push(cmd);
    }
  }

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async check() {
    return ESPToolWrapper.cmd.checkAndPrompt("esptool");
  }

  async install() {
    return ESPToolWrapper.cmd.installPythonModule("esptool");
  }

  async program(port?: string, firmware?: string) {
    const selected = port || (await UI.portPick());
    if (!selected) {
      ESPToolWrapper.message.showError("no port selected", "No port selected.");
      return;
    }

    let path: string;
    if (!firmware) {
      let picked = await UI.firmwarePick();
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

    const python = await ESPToolWrapper.cmd.checkPythonPath();
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
          const [cmd, opt] = ExternalCommand.splitCommandOptions(
            python,
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
            ])
          );
          const esptool = spawn(cmd, opt, { windowsHide: true })
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
    const selected = port || (await UI.portPick());
    if (!selected) {
      ESPToolWrapper.message.showError("no port selected", "No port selected.");
      return;
    }

    const python = await ESPToolWrapper.cmd.checkPythonPath();
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
          const [cmd, opt] = ExternalCommand.splitCommandOptions(
            python,
            ExternalCommand.getPythonModuleOptions("esptool", [
              "--chip",
              "esp32",
              "--port",
              selected,
              "erase_flash",
            ])
          );
          const esptool = spawn(cmd, opt, { windowsHide: true })
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
