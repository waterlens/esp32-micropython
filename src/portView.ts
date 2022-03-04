import * as vscode from "vscode";
import { SerialPort } from "serialport";

export class PortProvider implements vscode.TreeDataProvider<PortItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<PortItem | undefined> =
    new vscode.EventEmitter<PortItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<PortItem | undefined> =
    this._onDidChangeTreeData.event;

  constructor() {}

  getTreeItem(element: PortItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PortItem): vscode.ProviderResult<PortItem[]> {
    const portList = SerialPort.list();
    portList.then((ports) => console.log(ports));
    return portList.then((ports) =>
      ports
        .filter((port) => port.pnpId !== undefined)
        .map((port) => new PortItem(port.path!, port.pnpId || "no description", port.manufacturer || ""))
    );
  }
}

export class PortItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly tooltip: string,
    public readonly desc: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.tooltip = `${label} ${tooltip}`;
    this.description = desc;
  }

  iconPath = new vscode.ThemeIcon("plug");
  contextValue = "port";
}
