def scan():
    import json
    import network
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan_list = wlan.scan()
    return json.dumps(wlan_list)


print(scan())
del(globals()[scan.__name__])
