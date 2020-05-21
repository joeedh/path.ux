#!/bin/bash

VERSION=`cat package.json | grep version | sed 's/[" :,]//g' | sed 's/version//'`

git commit -a

echo Publishing $VERSION
bash build.sh && \
bash build_docs.sh && \
bash build_package.sh && \
cd package && \
npm publish

git tag -a $VERSION -m "Release $VERSION"
git push
