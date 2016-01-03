#!/bin/bash

function copy {
    rm -rfv $1 ../
    ln -s $1 ../$1
}

copy .config
copy .i3
copy .vimrc
copy .vscode
copy .bashrc
copy .gitconfig
