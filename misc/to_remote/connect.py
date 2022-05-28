def connect(config, retry, disconnect):
    import network
    ssid = config.wlan.ssid;
    password = config.wlan.password;
    wlan = network.WLAN(network.STA_IF)
    wlan.config(reconnects=retry)
    wlan.active(True)
    if disconnect:
        wlan.disconnect()
    wlan.connect(ssid, password)

if __name__ == "__main__":
    import config
    connect(config.get(), 3, True)
