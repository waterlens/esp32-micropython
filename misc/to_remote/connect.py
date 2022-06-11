from os import stat


def connect(config, retry, disconnect):
    import network
    wlan = config['wlan']
    ssid = wlan['ssid']
    password = wlan['password']
    static_ip = wlan['static_ip']
    wlan = network.WLAN(network.STA_IF)
    wlan.active(False)
    wlan.active(True)
    wlan.config(reconnects=retry)
    if disconnect:
        wlan.disconnect()
    wlan.connect(ssid, password)
    if static_ip != "":
        address = static_ip.split('.')[:3]
        default_gateway = address[0] + '.' + address[1] + '.' + address[2] + '.1'
        wlan.ifconfig((static_ip, '255.255.255.0', default_gateway, '8.8.8.8'))

if __name__ == "__main__":
    import config
    connect(config.get(), 3, True)
