import json
import sys
from pathlib import Path
from flask import Flask, render_template, jsonify

sys.path.insert(0, str(Path(__file__).parent))

with open("data/nodes.json") as f:
    NODES = json.load(f)

with open("data/edges.json") as f:
    EDGES = json.load(f)

with open("data/predictions.json") as f:
    PREDICTIONS = json.load(f)

app = Flask(__name__, template_folder=".", static_folder="views", static_url_path="/views")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/data/nodes")
def nodes():
    return jsonify(NODES)

@app.route("/data/edges")
def edges():
    return jsonify(EDGES)

@app.route("/data/predictions")
def predictions():
    return jsonify(PREDICTIONS)

if __name__ == "__main__":
    app.run(debug=True, port=5050)
