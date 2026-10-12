# Stage 1: builder - image tạm dùng để build Next.js, không xuất hiện trong image cuối
FROM node:20-alpine AS builder

WORKDIR /app

# Bật corepack và kích hoạt pnpm bản 9 (base image Node không có sẵn pnpm;
# pin bản 9 vì phải khớp lockfileVersion trong pnpm-lock.yaml)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy 2 file khai báo dependency trước, tách riêng khỏi COPY code bên dưới
# để Docker cache lại bước install khi chỉ code thay đổi, package.json thì không
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy toàn bộ source code còn lại
COPY . .

# Next.js inline biến NEXT_PUBLIC_* vào bundle ngay lúc build (không đọc lại
# lúc chạy), nên phải truyền vào qua ARG/ENV ở đây thay vì .env lúc runtime
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

# Build Next.js - next.config.ts có output: "standalone" nên sinh ra
# .next/standalone kèm sẵn node_modules cần thiết (traced dependencies)
RUN pnpm build


# Stage 2: production - image thật sự được deploy, chỉ chứa output standalone
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# Copy static assets công khai (ảnh, favicon...)
COPY --from=builder /app/public ./public
# Copy output standalone - đã tự chứa node_modules cần thiết nên không cần
# pnpm install ở stage này
COPY --from=builder /app/.next/standalone ./
# Copy static assets đã build (JS/CSS chunks)
COPY --from=builder /app/.next/static ./.next/static

# Chỉ để document port container lắng nghe; port thật do PORT bên dưới quyết định
EXPOSE 8000
# Port server standalone sẽ lắng nghe
ENV PORT=8000
# Bắt buộc là 0.0.0.0 (không phải default "localhost" của Next standalone),
# nếu không server chỉ nghe loopback trong container, request từ ngoài
# (qua port mapping) sẽ không tới được
ENV HOSTNAME=0.0.0.0

# server.js là entrypoint do "output: standalone" của Next tự sinh ra khi build
CMD ["node", "server.js"]
