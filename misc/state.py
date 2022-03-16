def state():
    import network
    import json
    wifi = network.WLAN(network.STA_IF)
    wifi.active(True)
    state = (wifi.status(), wifi.isconnected(), wifi.ifconfig())
    return json.dumps(state)

print(state())
del(globals()[state.__name__])
