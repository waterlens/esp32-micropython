def get():
    import json
    with open('config.json') as fp:
        data = json.load(fp)
    return data