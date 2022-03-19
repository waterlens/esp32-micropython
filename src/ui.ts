import * as vscode from "vscode";
import { PortUtil } from "./port";
import { WifiUtil } from "./wifi";

export class UI {
  static wlanPasswordInput() {
    return vscode.window.showInputBox({
      prompt: "Enter the password",
      password: true,
      validateInput: (value) => {
        if (value.length >= 8 && value.length <= 20) {
          return undefined;
        }
        return "Password must be between 8 and 20 characters";
      },
    });
  }

  static webReplPasswordInput() {
    return vscode.window.showInputBox({
      prompt: "Enter the password of WebREPL",
      password: true,
      validateInput: (value) => {
        if (value.length >= 4 && value.length <= 9) {
          return undefined;
        }
        return "Password must be between 4 and 9 characters";
      },
    });
  }

  static confirmWebReplPassword(password: string) {
    vscode.window.showInputBox({
      prompt: "Confirm the password of WebREPL",
      password: true,
      validateInput: (value) => {
        return value === password ? undefined : "Passwords do not match";
      },
    });
  }

  static async enableWebReplDaemon() {
    return (await vscode.window.showQuickPick(["Yes", "No"], {
      placeHolder: "Do you want enable WebREPL daemon?",
    })) === "Yes"
      ? true
      : false;
  }

  static async enableWLANDaemon() {
    return (await vscode.window.showQuickPick(["Yes", "No"], {
      placeHolder: "Do you want enable WLAN when booting?",
    })) === "Yes"
      ? true
      : false;
  }

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
