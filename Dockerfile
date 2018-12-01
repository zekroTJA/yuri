FROM    node:10.14.0-stretch
WORKDIR /usr/src/app
COPY    . .
RUN     apt update
RUN     wget \
            --no-cookies \
            --no-check-certificate \
            --header "Cookie: oraclelicense=accept-securebackup-cookie" \
            http://download.oracle.com/otn-pub/java/jdk/11.0.1+13/90cf5d8f270a4347a95050320eef3fb7/jdk-11.0.1_linux-x64_bin.deb
RUN     apt install libasound2 libasound2-data -y
RUN     dpkg -i jdk-11.0.1_linux-x64_bin.deb
RUN     rm -f jdk-11.0.1_linux-x64_bin.deb
RUN     update-alternatives --install /usr/bin/java java  /usr/lib/jvm/jdk-11.0.1/bin/java 2
RUN     apt install screen -y
RUN     apt install wget -y
RUN     wget https://github.com/Frederikam/Lavalink/releases/download/3.1.2/Lavalink.jar \
            -O lavalink/Lavalink.jar
RUN     npm install
EXPOSE  6612
CMD     ["bash", "runner.sh"]