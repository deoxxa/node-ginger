#!/bin/sh

echo "Compiling...";
pegjs res/parser.peg lib/parser.js;
echo "Done.";

echo "Running...";
./test.js;
echo "Done.";
