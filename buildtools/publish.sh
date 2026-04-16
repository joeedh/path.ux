#!/bin/bash

#ensure we're in right working directory
if [ ! -d "./buildtools" ]
then
cd ..
fi

VERSION=`cat package.json | grep version | sed 's/[" :,]//g' | sed 's/version//'`

git commit -a
echo $?
git pull
echo $?
git push
echo $?

echo Publishing $VERSION
echo $?
pnpm build  
echo $?

#bash build_docs.sh && \
bash buildtools/build_package_new.sh
echo $?

cd _package
echo $?

echo "npm publish"
echo $?
npm publish --access public
echo $?

cd ..
rm -rf _package
#git tag -a $VERSION -m "Release $VERSION"
