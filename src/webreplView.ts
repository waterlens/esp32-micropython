import * as vscode from 'vscode';
import { DeviceType, webBuffer, WebDevice, webGetFileDone } from './connectionHandler';
import { TerminalWrapper } from './terminal';

export class WebreplProvider implements vscode.TreeDataProvider<WebreplItem> {
    private changeEvent = new vscode.EventEmitter<WebreplItem | undefined>();
    private deviceFileMap: Map<string, string> = new Map();
    private fileNames: string[] = [];
    onDidChangeTreeData? = this.changeEvent.event;
    private changeState = 0;

    constructor(context: vscode.ExtensionContext) {
        // webGetFileDone.event.on('done', list => {
        //     this.fileNames = list;
        //     this.changeEvent.fire(undefined);
        //     this.changeState = 1;
        // });
        webGetFileDone.event(() => {
            this.fileNames = webBuffer;
            this.changeState = 1;
            this.changeEvent.fire(undefined);
        });
    }

    getTreeItem(element: WebreplItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: WebreplItem): vscode.ProviderResult<WebreplItem[]> {
        if (element?.type === WebreplItemType.folder) {

        } else if (element?.type === WebreplItemType.device) {
            // let nameList = getDeviceFiles(element?.label);
            // return nameList.then(val => val.map(singleVal => new WebreplItem(singleVal, "", "", WebreplItemType.file)));
            if (this.changeState === 0) {
                TerminalWrapper.getDeviceFiles(element.label, DeviceType.webDevice);
            } else {
                this.changeState = 0;
            }
            return this.fileNames.filter(name => name.includes('\.')).map(name => new WebreplItem(name, "", "", WebreplItemType.file));
        } else {
            let ipList = TerminalWrapper.getWebDeviceList(); 
            let viewList = ipList.map(ip => new WebreplItem(ip, "", "", WebreplItemType.device));
            return viewList;
        }
    }
    
    refresh() {
        this.changeEvent.fire(undefined);
    }
}

enum WebreplItemType {
    device,
    folder,
    file,
}

export class WebreplItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly desc: string,
        public readonly type: WebreplItemType,
    ) {
        let collapsibleStatus;
        if (type === WebreplItemType.device) {
            collapsibleStatus = vscode.TreeItemCollapsibleState.Collapsed;
        } else if (type === WebreplItemType.file) {
            collapsibleStatus = vscode.TreeItemCollapsibleState.None;
        } else {
            collapsibleStatus = vscode.TreeItemCollapsibleState.Expanded;
        }

        super(label, collapsibleStatus);

        this.tooltip = `${label}: ${tooltip}`;
        this.description = desc;

        if (this.type === WebreplItemType.device) {
            this.iconPath = new vscode.ThemeIcon("plug");
        } else if (this.type === WebreplItemType.file) {
            this.iconPath = new vscode.ThemeIcon('file-code');
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }

    iconPath = new vscode.ThemeIcon("plug");
    
    contextValue = "port";
}

export class WebreplTreeView {

    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    register() {
        let provider = new WebreplProvider(this.context);
        vscode.window.registerTreeDataProvider('emp.web_port', provider);
        vscode.commands.registerCommand("emp.web_port.refresh", () => {
            provider.refresh();
        });
    }
}

function getDeviceFiles(deviceIp: string): void  {
    TerminalWrapper.getDeviceFiles(deviceIp, DeviceType.webDevice);
}