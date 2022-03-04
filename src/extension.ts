import * as vscode from "vscode";
import { PortProvider } from "./portView";

export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');
  const portView = new PortProvider();
  vscode.window.registerTreeDataProvider("portView", portView);

  let refreshPortView = vscode.commands.registerCommand(
    "portView.refreshEntry",
    () => portView.refresh()
  );

  context.subscriptions.push(refreshPortView);
}

export function deactivate() {}
