"""MTG Tracker as a standalone app on :5001.

All of the app lives in the `tracker` blueprint; this file only hosts it, so
the same blueprint can later be registered inside another Flask site.
"""
import os

from flask import Flask, redirect, request
from werkzeug.middleware.proxy_fix import ProxyFix

import tracker

app = Flask(__name__)
# Behind Apache at /mtg-tracker/, the proxy strips the prefix and sends it as
# X-Forwarded-Prefix; this makes url_for() include it.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=0, x_proto=0, x_host=0, x_prefix=1)
app.register_blueprint(tracker.bp)


@app.route("/mtg-tracker/")
@app.route("/mtg-tracker/<path:rest>")
def old_prefix(rest=""):
    # The Svelte version once lived under /mtg-tracker/ on this port.
    return redirect(request.script_root + "/" + rest, code=301)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)))
