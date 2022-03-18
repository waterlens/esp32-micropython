def connect(s):
    import json
    import network
    retry = 3
    ssid, password = json.loads(s)
    wlan = network.WLAN(network.STA_IF)
    wlan.config(reconnects=retry)
    wlan.active(True)
    wlan.disconnect()
    wlan.connect(ssid, password)


connect("""__##stub##__""")
del(globals()[connect.__name__])
