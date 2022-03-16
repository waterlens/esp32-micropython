import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from 'vscode';
import { SerialPort } from "serialport";
import { EmpTerminal } from "./terminal";

export enum DeviceType {
    webDevice,
    serialDevice,
}

export class DeviceId {
    deviceType: DeviceType;
    devicePath: string; 
    // password: string = "__invalid__";

    constructor(type: DeviceType, path: string) {
        this.devicePath = path;
        this.deviceType = type;
        // if (password) {
        //     this.password = password;
        // }
    }
}

export interface EmpDevice {
    onTerminalData: (data: string) => void;
    sendData(data: string): void;
    linkedTerminals: Array<EmpTerminal>;
    attachTerminal(terminal: EmpTerminal): void;
    detachTerminal(terminal: EmpTerminal): void;
}

export class SerialDevice implements EmpDevice {
    onTerminalData = (data: string) => {
        console.log(data);
        console.log(this.linkedTerminals.length);
        for (let i of this.linkedTerminals) {
            i.writeEmitter.fire(data);
        }
    }; 

    private serialPort: SerialPort;
    linkedTerminals = new Array();

    constructor(portPath: string) {
        // this.serialPort = serialPort;
        this.serialPort = new SerialPort({
            path: portPath,
            baudRate: 115200,
            hupcl: false,
        });

        this.serialPort.on("data", (data) => {
            this.onTerminalData(data.toString());
        });
    }


    sendData(data: string): void {
        this.serialPort.write(data);
    }

    attachTerminal(terminal: EmpTerminal): void {
        this.linkedTerminals.push(terminal);
    }

    detachTerminal(terminal: EmpTerminal): void {
        for (let i = 0; i < this.linkedTerminals.length; i++) {
            if (this.linkedTerminals[i] === terminal) {
                this.linkedTerminals.splice(i, 1);
                break;
            }
        }
    }
}

export class WebDevice extends MicroPythonDevice implements EmpDevice {
    linkedTerminals: Array<EmpTerminal>;

    constructor() {
        super();
        this.linkedTerminals = new Array();
        this.onTerminalData = (data: string) => {
            for (let i of this.linkedTerminals) {
                i.writeEmitter.fire(data);
            }
        }; 
    }

    attachTerminal(terminal: EmpTerminal): void {
        this.linkedTerminals.push(terminal);
    }

    detachTerminal(terminal: EmpTerminal): void {
        for (let i = 0; i < this.linkedTerminals.length; i++) {
            if (this.linkedTerminals[i] === terminal) {
                this.linkedTerminals.splice(i, 1);
                break;
            }
        }
    }

}

export class ConnectionHandler {
    private deviceMap: Map<DeviceId, EmpDevice> = new Map();
    // private countMap: Map<DeviceId, number> = new Map();

    constructor() {

    }

    getDeviceList(): Array<DeviceId> {
        return [...this.deviceMap.keys()];
    }

    peekDevice(deviceId: DeviceId): EmpDevice | undefined {
        return this.deviceMap.get(deviceId);
    }

    async takeDevice(deviceId: DeviceId): Promise<EmpDevice> {
        let ret = this.peekDevice(deviceId);
        if (ret === undefined) {
            if (deviceId.deviceType === DeviceType.serialDevice) {
                ret = new SerialDevice(deviceId.devicePath);
                this.deviceMap.set(deviceId, ret);
            } else {
                let temp = new WebDevice();
                let password = await getPassword();
                temp.connectNetwork(deviceId.devicePath, password);
                this.deviceMap.set(deviceId, temp);
                ret = temp;
            }
        }
       return ret;
    }
}


async function getPassword(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let passwordBar = vscode.window.createInputBox();
        let ret: string;
        passwordBar.password = true;

        passwordBar.onDidChangeValue((val: string) => {
            ret = val;
        });

        passwordBar.onDidAccept(() => {
            passwordBar.dispose();
            resolve(ret);
        });

        passwordBar.show();

    });
}

export async function getIpAddr(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let ipBar = vscode.window.createInputBox();
        let ret: string;

        ipBar.onDidChangeValue((val: string) => {
            ret = val;
        });

        ipBar.onDidAccept(() => {
            ipBar.dispose();
            resolve(ret);
        });

        ipBar.show();

    });
}

class PortPickItem implements vscode.QuickPickItem{
	label: string;
	constructor(name: string) {
		this.label = name;
	}
}

export async function getSerialPort(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const quickPick = vscode.window.createQuickPick();
        const portList = SerialPort.list();
        portList.then((ports) => {
            quickPick.items = ports.map(port => new PortPickItem(port.path));
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.onDidChangeSelection(
            selection => {
                resolve(selection[0].label);
                quickPick.dispose();
            }
        );
        quickPick.show();
        });
}