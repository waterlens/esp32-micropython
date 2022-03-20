import * as vscode from "vscode";
import { SerialPort } from "serialport";

export class PortProvider implements vscode.TreeDataProvider<PortItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<PortItem | undefined> =
    new vscode.EventEmitter<PortItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<PortItem | undefined> =
    this._onDidChangeTreeData.event;
  private context;

  registerProvider() {
    return [vscode.window.registerTreeDataProvider("emp.port", this)];
  }

  registerAllCommands() {
    return [
      vscode.commands.registerCommand("emp.port.refresh", () => this.refresh()),
    ];
  }

  register() {
    for (const cmd of this.registerAllCommands()) {
      this.context.subscriptions.push(cmd);
    }
    for (const provider of this.registerProvider()) {
      this.context.subscriptions.push(provider);
    }
  }

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: PortItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PortItem): vscode.ProviderResult<PortItem[]> {
    const portList = SerialPort.list();
    portList.then((ports) => console.log(ports));
    return portList.then((ports) =>
      ports
        .filter((port) => port.pnpId !== undefined)
        .map(
          (port) =>
            new PortItem(
              port.path!,
              port.pnpId || "no description",
              port.manufacturer || ""
            )
        )
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

    this.tooltip = `${label}: ${tooltip}`;
    this.description = desc;
  }

  iconPath = new vscode.ThemeIcon("plug");
  contextValue = "port";
}
