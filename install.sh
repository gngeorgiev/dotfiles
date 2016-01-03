#!/bin/bash

function copy {
    cp -rfv $1 ../
}

copy .config
copy .i3
copy .vimrc
copy .vscode
