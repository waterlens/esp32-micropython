import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import { ExternalCommand } from "./extCmd";
import { Message } from "./message";
import { UI } from "./ui";

export class ConnectionUtil {
  private static readonly message = new Message("connection util");
  private static readonly exec = promisify(exec);
  private static readonly spawn = promisify(spawn);
  private static readonly cmd = new ExternalCommand(this.message);
  private static context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    ConnectionUtil.context = context;
  }

  async scanAP(path?: string, port?: string) {
    const prefix = path || (await ConnectionUtil.cmd.checkPythonPath());
    try {
    } catch (error) {
      ConnectionUtil.message.showError(
        "can't scan wifi on device",
        "Can't scan wifi: " + error
      );
    }
  }

  async prepareWiFi(port?: string) {
    const selected = port || (await UI.portPick());
    if (!selected) {
      ConnectionUtil.message.showError("no port selected", "No port selected.");
      return;
    }
    const python = await ConnectionUtil.cmd.checkPythonPath();
    const installed = await ConnectionUtil.cmd.checkAndPrompt("mpremote", true);
    if (!installed) {
      return;
    }
  }
}
