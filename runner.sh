#!/bin/bash

# RUNNER FILE FOR DOCKER IMAGE

cd lavalink
screen -dmS lavalink \
    java -jar Lavalink.jar
cd ..

while true; do
    npm start
done