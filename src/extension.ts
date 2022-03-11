import * as vscode from "vscode";
import { PortProvider } from "./portView";
import { ESPToolWrapper } from "./esptool";

export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');

  const portView = new PortProvider();
  const esptoolWrapper = new ESPToolWrapper();

  vscode.window.registerTreeDataProvider("emp.port", portView);
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.port.refresh", () =>
      portView.refresh()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.esptool.install", () =>
      esptoolWrapper.install()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.esptool.uninstall", () =>
      esptoolWrapper.uninstall()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.esptool.check", () =>
      esptoolWrapper.check()
    )
  );
}

export function deactivate() {}
