FROM    node:10.14.0-stretch
FROM    openjdk:11.0.1-jdk-oracle
WORKDIR /usr/src/app
COPY    . .
RUN     wget https://github.com/Frederikam/Lavalink/releases/download/3.1.2/Lavalink.jar
RUN     mv Lavalink.jar lavalink/Lavalink.jar
RUN     apt-get update
RUN     apt-get install screen -y
RUN     npm install
EXPOSE  6612
CMD     ["bash", "runner.sh"]