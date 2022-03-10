import { SerialPort } from "serialport";
import { SerialPortStream } from '@serialport/stream';
import { SetOptions, BindingInterface, PortInterfaceFromBinding, OpenOptionsFromBinding } from '@serialport/bindings-interface';
import { TestRunRequest } from "vscode";

export function showAvailablePorts() {
    const portList = SerialPort.list();
    portList.then((ports) => console.log(ports));
}

export function launchTerminal() {
    showAvailablePorts();
    const port = new SerialPort({
        path: 'COM4',
        baudRate: 115200,
        autoOpen: false,
    });

    let myConfig: SetOptions = {
        brk: true,
        cts: true,
        dtr: false,
        // lowLatency: false,
    };

    port.set(myConfig);

    port.open();

    port.on('readable', function() {
        console.log(port.read().toString());
    });
}