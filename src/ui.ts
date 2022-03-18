import * as vscode from "vscode";
import { PortUtil } from "./port";
import { WifiUtil } from "./wifi";

export class UI {
  static apPick(util: WifiUtil) {
    return vscode.window.showQuickPick(util.getInfo());
  }

  static portPick() {
    return vscode.window.showQuickPick(PortUtil.listAsStringArray());
  }

  static firmwarePick() {
    const options: vscode.OpenDialogOptions = {
      canSelectMany: false,
      openLabel: "Select a firmware file",
      canSelectFiles: true,
      canSelectFolders: false,
    };
    return vscode.window.showOpenDialog(options);
  }
}
