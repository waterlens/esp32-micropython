def scan():
    import json
    import network
    wifi = network.WLAN(network.STA_IF)
    wifi.active(True)
    wifi_list = wifi.scan()
    wifi_list_json = json.dumps(wifi_list)
    return wifi_list_json

print(scan())
del(globals()[scan.__name__])
