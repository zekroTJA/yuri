FROM    openjdk:11.0.1-jdk-oracle
FROM    node:10.14.0-stretch
WORKDIR /usr/src/app
COPY    . .
RUN     apt update
RUN     apt install screen -y
RUN     apt install curl -y
RUN     curl https://github.com/Frederikam/Lavalink/releases/download/3.1.2/Lavalink.jar -o lavalink/Lavalink.jar
RUN     npm install
EXPOSE  6612
CMD     ["bash", "runner.sh"]