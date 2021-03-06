from typing import Any

class Func:
    f: Any
    restype: Any
    def __init__(self, f, restype) -> None: ...
    def __call__(self, *args): ...

class Var:
    v: Any
    def __init__(self, v) -> None: ...
    def get(self): ...

class DynMod:
    typemap: Any
    mod: Any
    def __init__(self, name) -> None: ...
    def func(self, ret, name, params): ...
    def var(self, type, name): ...

def open(name): ...
def func(ret, addr, params): ...
def callback(ret, func, params): ...
