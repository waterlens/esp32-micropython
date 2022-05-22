def connect(s, retry, disconnect):
    import json
    import network
    ssid, password = json.loads(s)
    wlan = network.WLAN(network.STA_IF)
    wlan.config(reconnects=retry)
    wlan.active(True)
    if disconnect:
        wlan.disconnect()
    wlan.connect(ssid, password)


PASS = """["bvwifi","idontknow1"]"""
if __name__ == "__main__":
    connect(PASS, 3, True)
