#!/bin/bash

#ensure we're in right working directory
if [ ! -d "./buildtools" ]
then
cd ..
fi

./node_modules/.bin/rollup --config ./rollup.config.js

