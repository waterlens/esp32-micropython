import { exec, spawn } from "child_process";
import path = require("path");
import { promisify } from "util";
import * as vscode from "vscode";
import { ExternalCommand } from "./externalCmd";
import { Message } from "./message";
import { PortUtil } from "./port";

export class ConnectionUtil {
  private static readonly message = new Message("connection util");
  private static readonly exec = promisify(exec);
  private static readonly spawn = promisify(spawn);
  private static readonly cmd = new ExternalCommand(this.message);
  private static context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    ConnectionUtil.context = context;
  }

  private portPick() {
    return vscode.window.showQuickPick(PortUtil.listAsStringArray());
  }

  async scanAP(pyPrefix: string) {
    try {
      const esptool = await ConnectionUtil.exec(
        ExternalCommand.getFullCommandString(pyPrefix, "mpremote", [
          "run",
          ConnectionUtil.context.asAbsolutePath(path.join("misc", "scan.py")),
        ]),
        { windowsHide: true }
      );
      console.log(JSON.parse(esptool.stderr));
    } catch (error) {
      ConnectionUtil.message.showError(
        "can't scan wifi on device",
        "Can't scan wifi: " + error
      );
    }
  }

  async prepareWiFi(port?: string) {
    const selected = port || (await this.portPick());
    if (!selected) {
      ConnectionUtil.message.showError("no port selected", "No port selected.");
      return;
    }
    const pyPrefix = await ConnectionUtil.cmd.checkPython();
    const installed = await ConnectionUtil.cmd.checkAndPrompt("mpremote", true);
    if (!installed) {
      return;
    }
  }
}
