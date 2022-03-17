import * as vscode from "vscode";
import { PortItem, PortProvider } from "./portView";
import { ESPToolWrapper } from "./esptool";
import { ConnectionUtil } from "./connection";

export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');

  const portView = new PortProvider();
  const esptoolWrapper = new ESPToolWrapper();
  const connectionUtil = new ConnectionUtil(context);

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
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.esptool.erase", (item?: PortItem) =>
      item ? esptoolWrapper.erase(item.label) : esptoolWrapper.erase()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.esptool.program", (item?: PortItem) =>
      item ? esptoolWrapper.program(item.label) : esptoolWrapper.program()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.remote.scan", () =>
      connectionUtil.scanAP()
    )
  );
}

export function deactivate() {}
