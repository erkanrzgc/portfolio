# syntax=docker/dockerfile:1

# ── 1. aşama: derleme ────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Önce yalnızca manifest'ler kopyalanıyor. Kaynak her değiştiğinde
# `npm ci` yeniden koşmasın diye: Docker katman önbelleği ancak
# bağımlılık kurulumu kaynak kopyalamadan ÖNCE gelirse işe yarar.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `npm run build` = `tsc && vite build`.
# tsc'nin burada koşması KASITLI: tip hatası olan bir commit imaj
# üretmemeli. Derleme kapısı, dağıtım kapısından ucuzdur.
RUN npm run build

# ── 2. aşama: servis ─────────────────────────────────────────────────
# nginx-unprivileged, root OLMAYAN bir kullanıcıyla çalışır ve 8080
# dinler. Ayrıcalıklı port (80) kullanılmadığı için konteynerin
# CAP_NET_BIND_SERVICE'e ihtiyacı yok — Panely zaten konteynerlere ek
# yetenek vermiyor.
FROM nginxinc/nginx-unprivileged:1.31-alpine

# Varsayılan sunucu bloğu tamamen değiştiriliyor; üzerine eklenmiyor.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Yalnızca derleme çıktısı taşınıyor: node_modules ve kaynak nihai
# imajda YOK.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
