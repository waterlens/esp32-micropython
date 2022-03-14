import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from 'vscode';
import { SerialPort } from "serialport";

export enum DeviceType {
    webDevice,
    serialDevice,
}

export class DeviceId {
    deviceType: DeviceType;
    devicePath: string; 

    constructor(type: DeviceType, path: string) {
        this.devicePath = path;
        this.deviceType = type;
    }
}

export class ConnectionHandler {
    private deviceMap: Map<DeviceId, MicroPythonDevice> = new Map();

    constructor() {

    }

    getDeviceList(): Array<DeviceId> {
        return [...this.deviceMap.keys()];
    }

    peekDevice(deviceId: DeviceId): MicroPythonDevice | undefined {
        return this.deviceMap.get(deviceId);
    }

    async takeDevice(deviceId: DeviceId): Promise<MicroPythonDevice> {
        let ret = this.peekDevice(deviceId);
        if (ret === undefined) {
            if (deviceId.deviceType === DeviceType.serialDevice) {
                ret = new MicroPythonDevice();
                console.log(deviceId.devicePath);
                await ret.connectSerial(deviceId.devicePath);
                this.deviceMap.set(deviceId, ret);
            } else {
                ret = new MicroPythonDevice();
                let password = await getPassword();
                console.log(deviceId.devicePath);
                console.log(password);
                await ret.connectNetwork(deviceId.devicePath, password);
                this.deviceMap.set(deviceId, ret);
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