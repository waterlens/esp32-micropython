import * as vscode from "vscode";
import { SerialPort } from "serialport";
import { TerminalWrapper } from "./terminal";
import { DeviceType, serialGetFileDone, serialBuffer } from "./connectionHandler";

enum PortItemType {
    device,
    folder,
    file,
}

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

  private fileNames: string[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    serialGetFileDone.event(() => {
        this.fileNames = serialBuffer;
        this.changeState = 1;
        this._onDidChangeTreeData.fire(undefined);
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: PortItem): vscode.TreeItem {
    return element;
  }

  private changeState = 0;

  getChildren(element?: PortItem): vscode.ProviderResult<PortItem[]> {
    if (element === undefined) {
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
                port.manufacturer || "",
                PortItemType.device,
                )
            )
        );
    } else if (element. type === PortItemType.device) {
        if(this.changeState === 0) {
            TerminalWrapper.getDeviceFiles(element.label, DeviceType.serialDevice);
        } else {
            this.changeState = 0;
        }
        return this.fileNames.filter(name => name.includes('\.')).map(name => new PortItem(name, "", "", PortItemType.file));
        // return nameList.then(nameList => nameList.map(name => new PortItem(name, "", "", PortItemType.file)));
    }
  }
}

export class PortItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly tooltip: string,
    public readonly desc: string,
    public readonly type: PortItemType,
  ) {
    // super(label, vscode.TreeItemCollapsibleState.None);

        let collapsibleStatus;
        if (type === PortItemType.device) {
            collapsibleStatus = vscode.TreeItemCollapsibleState.Collapsed;
        } else if (type === PortItemType.file) {
            collapsibleStatus = vscode.TreeItemCollapsibleState.None;
        } else {
            collapsibleStatus = vscode.TreeItemCollapsibleState.Expanded;
        }

        super(label, collapsibleStatus);

        this.tooltip = `${label}: ${tooltip}`;
        this.description = desc;

        if (this.type === PortItemType.device) {
            this.iconPath = new vscode.ThemeIcon("plug");
        } else if (this.type === PortItemType.file) {
            this.iconPath = new vscode.ThemeIcon('file-code');
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
  }

  iconPath = new vscode.ThemeIcon("plug");
  contextValue = "port";
}
