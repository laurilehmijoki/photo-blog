#!/bin/bash -e

npm install

env_file=.env_production
if [ -f $env_file ]; then
  echo "Reading settings from ${env_file} file"
  source $env_file
fi

node_modules/node-sass/bin/node-sass app/scss/style.scss --output .generated
node_modules/browserify/bin/cmd.js --entry app/client.js | node_modules/uglify-js/bin/uglifyjs --compress --mangle > .generated/bundle.js

set +e # forever stop exits if the process is not running
./node_modules/.bin/forever stop app/bootstrap.js
set -e
./node_modules/.bin/forever start app/bootstrap.js
