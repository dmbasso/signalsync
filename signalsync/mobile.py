# -*- coding: utf-8 -*-

import os
import time
from webmod import routing as rt, websocket as ws


res_path = os.path.join(os.path.dirname(__file__), "mobile/")

mod = rt.Module("qr_sync")

# @mod.mount_setup
# def qr_mnt_su(mnt):
#     path = mount.path()


@mod
def qr_root(do):
    return ws.convert_request(do, PingHandler)


def default_to_cb(ping_handler, toff):
    ping_handler.send("status ok camera=?")


class PingHandler(ws.Handler):
    # pings = {}
    time_offset_cb = default_to_cb

    def on_message(self, msg):
        if msg.startswith("set "):
            try:
                toff = int(msg[4:])
            except ValueError:
                print("toff %r" % toff)
                return self.send("status error not a number")
            if self.time_offset_cb:
                self.time_offset_cb(toff)
            return
        self.send("%s %.3f" % (msg, time.time() * 1000))

    def on_disconnect(self, reason):
        pass


if __name__ == '__main__':
    import logging
    from twisted.internet import reactor
    from webmod.server import Server
    config = {
        "debug": True, "log": "http.log",
        "host": "0.0.0.0",
        "port": 8011,
        "ssl": False,
        "routes": [
            ["", "static", {"path": res_path}],
            ["ws", "qr_sync"],
        ],
    }

    logging.basicConfig(level=logging.DEBUG)
    server = Server()
    server.load_config(config)
    reactor.run()
