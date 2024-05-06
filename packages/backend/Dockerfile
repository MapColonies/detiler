FROM node:20 as build

ARG package=backend

WORKDIR /tmp/buildApp

COPY ./packages/${package}/package.json ./

RUN npm install

COPY ./packages/${package} ./
COPY ./tsconfig.json ./tsconfig.build.json ./

RUN npm run build

FROM node:20.3.1-alpine3.17 as production

ARG package=backend

RUN apk add dumb-init

ENV NODE_ENV=production
ENV SERVER_PORT=8080

WORKDIR /usr/src/app

COPY --chown=node:node ./packages/${package}/package.json ./

RUN npm install --omit=dev

COPY --chown=node:node --from=build /tmp/buildApp/dist .
COPY --chown=node:node --from=build /tmp/buildApp/config ./config

USER node
EXPOSE 8080
CMD ["dumb-init", "node", "--max_old_space_size=512", "./index.js"]
