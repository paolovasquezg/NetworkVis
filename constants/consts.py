import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

#Scrapping
SCRAP_URL          = "https://cris.utec.edu.pe/es/persons/"
REQUEST_DELAY_SECS = 3.5
CHROME_VERSION     = 148  
OUTPUT_FILE        = os.path.join(DATA_DIR, "profiles.json")

#Transform
NETWORK_FILE      = os.path.join(DATA_DIR, "network.json")
PROFILES_FILE     = os.path.join(DATA_DIR, "profiles.json")
NODES_FILE        = os.path.join(DATA_DIR, "nodes.json")
EDGES_FILE        = os.path.join(DATA_DIR, "edges.json")
PREDICTIONS_FILE  = os.path.join(DATA_DIR, "predictions.json")
TOP_N_PREDICTIONS = 50
