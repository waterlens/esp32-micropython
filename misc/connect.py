def connect(s):
    import json
    import network
    ssid, password = json.loads(s)
    wifi = network.WLAN(network.STA_IF)
    wifi.active(True)
    wifi.disconnect()
    wifi.connect(ssid, password)

connect("""__##stub##__""")
del(globals()[connect.__name__])