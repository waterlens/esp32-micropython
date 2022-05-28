def connect(config, retry, disconnect):
    import network
    wlan = config['wlan']
    ssid = wlan['ssid']
    password = wlan['password']
    wlan = network.WLAN(network.STA_IF)
    wlan.active(False)
    wlan.active(True)
    wlan.config(reconnects=retry)
    if disconnect:
        wlan.disconnect()
    wlan.connect(ssid, password)

if __name__ == "__main__":
    import config
    connect(config.get(), 3, True)
