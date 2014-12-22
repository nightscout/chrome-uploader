#!/bin/bash
rm -rf node_modules
rm -rf .git
rm npm-debug.log
rm -rf tests
rm resource/chrome-promotional-small.png
rm vendor/jquery/dist/jquery.js
rm vendor/jquery/dist/jquery.min.map
rm -rf vendor/jquery/src
rm vendor/jquery-ui/jquery-ui.js
rm -rf vendor/jquery-ui/ui
mv vendor/jquery-ui/themes/smoothness/ .smoothness
rm -rf vendor/jquery-ui/themes/*
mv .smoothness vendor/jquery-ui/themes/smoothness
rm vendor/jquery-ui/themes/smoothness/jquery-ui.css
rm -rf vendor/qunit
rm -rf vendor/qunit-phantom-runner
rm -rf vendor/bootstrap/test-infra
rm Brocfile.js
rm bower.json
rm .bowerrc
rm package.json
rm deploy.sh