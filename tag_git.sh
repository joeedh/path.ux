#!/bin/bash

VERSION=`cat package.json | grep version | sed 's/[" :,]//g' | sed 's/version//'`

git commit -a
git push

git tag -a $VERSION -m "Release $VERSION"
git push
