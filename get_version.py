import json, sys

file = open("package.json", "r")
buf = file.read()
file.close()

jdata = json.loads(buf)

sys.stdout.write(str(jdata["version"]) + "\n")
sys.stdout.flush()
