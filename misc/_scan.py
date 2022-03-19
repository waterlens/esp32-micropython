def scan():
    import json
    import network
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan_list = wlan.scan()
    return json.dumps(wlan_list)


if __name__ == "__main__":
    print(scan())
