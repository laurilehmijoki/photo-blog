#!/bin/bash -e

npm install

env_file=.env_development
if [ -f $env_file ]; then
  echo "Reading settings from ${env_file} file"
  source $env_file
fi

node_modules/nodemon/bin/nodemon.js \
  --quiet \
  --exec "node_modules/node-sass/bin/node-sass app/scss/style.scss --output .generated" \
  --include-path="app" \
  --ext scss &

node_modules/watchify/bin/cmd.js app/client.js \
  --debug \
  -o .generated/bundle.js \
  -v \
  &

node_modules/supervisor/lib/cli-wrapper.js --quiet --ignore node_modules --watch app app/bootstrap.js
