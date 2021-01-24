import os, os.path, sys

times = {}
build = False

import time

def log(msg):
    print(msg)
    sys.stdout.flush()

filelist = []

basepath = os.getcwd()

if basepath.endswith("buildtools"):
    os.chdir(os.path.abspath("../"))

for root, dir, files in os.walk('./scripts'):
    for f in files:
        if not f.lower().endswith(".js"): continue
        f = os.path.join(root, f)

        filelist.append(f)

log("Watching %i files..." % len(filelist))

while 1:
    build = False
    files2 = []
    for f in filelist:
        time1 = os.stat(f).st_mtime

        if f not in times or time1 > times[f]:
            build = True
            files2.append(f)

    for f in files2:
        times[f] = os.stat(f).st_mtime

    if build:
        os.system('bash buildtools/build.sh')
        print("\n\n\n")
        sys.stdout.flush()
        sys.stderr.flush()

    time.sleep(0.15)


