import * as vscode from "vscode";
import { PortItem, PortProvider } from "./portView";
import { ESPToolWrapper } from "./esptool";
import { ConnectionUtil } from "./connection";

export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');

  const portView = new PortProvider(context);
  const esptoolWrapper = new ESPToolWrapper(context);
  const connectionUtil = new ConnectionUtil(context);
  
  portView.register();
  esptoolWrapper.register();
}

export function deactivate() {}
