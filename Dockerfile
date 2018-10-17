FROM    node:8
WORKDIR /usr/src/app
COPY    . .
RUN     sudo echo deb http://www.deb-multimedia.org testing main non-free /etc/apt/sources.list
RUN     sudo apt update
RUN     sudo apt install deb-multimedia-keyring
RUN     sudo apt update
RUN     sudo apt install ffmpeg
RUN     npm install
EXPOSE  6612
CMD     ["npm", "start"]