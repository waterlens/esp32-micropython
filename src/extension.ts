import * as vscode from "vscode";
import { DownloadUtil } from "./downloadUtil";
import { PortProvider } from "./portView";

export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');

  const portView = new PortProvider();
  const downloadUtil = new DownloadUtil();

  vscode.window.registerTreeDataProvider("emp.port", portView);
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.port.refresh", () =>
      portView.refresh()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.download.esptool", () =>
      downloadUtil.downloadESPTool()
    )
  );
}

export function deactivate() {}
