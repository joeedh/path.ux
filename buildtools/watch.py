import os, os.path, sys

times = {}
build = False

import time

while 1:
    build = False
    files2 = []
    for root, dir, files in os.walk('../scripts'):
        for f in files:
            if not f.lower().endswith(".js"): continue
            f = os.path.join(root, f)

            files2.append(f);
            time1 = os.stat(f).st_mtime

            if f not in times or time1 > times[f]:
                build = True

    for f in files2:
        times[f] = os.stat(f).st_mtime

    if build:
        os.system('bash build.sh')
        print("\n\n\n")

    time.sleep(0.15)


