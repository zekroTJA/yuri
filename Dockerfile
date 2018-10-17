FROM    node:8
WORKDIR /usr/src/app
COPY    . .
RUN     npm install
EXPOSE  6612
CMD     ["npm", "start"]