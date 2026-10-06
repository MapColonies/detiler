FROM node:24 as build

ARG package=frontend

WORKDIR /tmp/buildApp

COPY ./packages/${package}/package.json ./

# only package.json is copied in at this point (no lockfile), so npm resolves peer deps from scratch here;
# --legacy-peer-deps works around the maplibre-gl fork/react-map-gl peer range conflict that a full
# workspace install (which uses the committed root package-lock.json) doesn't hit
RUN npm install --legacy-peer-deps

COPY ./packages/${package} ./
COPY ./packages/${package}/tsconfig.json ./tsconfig.build.json

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.24.0-alpine3.17 as deploy

USER root

ARG package=frontend

COPY --from=build /tmp/buildApp/dist /usr/share/nginx/html
COPY ./packages/${package}/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./packages/${package}/env.sh /docker-entrypoint.d/env.sh

RUN chmod -R g+w /usr/share/nginx /var/cache/nginx /var/run

RUN chmod +x /docker-entrypoint.d/env.sh

RUN chgrp -R 0 /usr/share/nginx && \
    chmod -R g=u /usr/share/nginx

RUN adduser -S user -G root

USER user
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
