# This file is executed on every boot (including wake-boot from deepsleep)
#import esp
#esp.osdebug(None)

def init():
    import config
    import connect

    config = config.get()
    if config['wlan']['enabled']:
        connect.connect(config, -1, False)
    if config['web_repl']['enabled']:
        import webrepl
        webrepl.start()

init()