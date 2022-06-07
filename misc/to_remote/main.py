import network

wlan = network.WLAN(network.STA_IF)
wlan.ifconfig()

import webrepl
webrepl.start()