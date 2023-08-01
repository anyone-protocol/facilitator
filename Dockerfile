# BUILD
FROM node:18.17-alpine As build

WORKDIR /usr/src/app

COPY --chown=node:node . .

RUN npm install

RUN npx hardhat compile

RUN chown -R node:node .

USER node
