# Stage 1: builder - image tạm dùng để compile code, không xuất hiện trong image cuối
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
# Compile TypeScript (src/) thành JavaScript (dist/) - runtime chỉ chạy được JS
RUN pnpm build


# Stage 2: production - image thật sự được deploy, không mang theo devDependencies
# hay source .ts của stage builder
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# Cài lại pnpm - mỗi FROM là một stage/filesystem riêng, không kế thừa gì
# đã cài ở stage builder
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml ./
# --prod: chỉ cài dependencies cần lúc chạy, bỏ qua eslint/jest...
# giúp image nhẹ hơn
RUN pnpm install --frozen-lockfile --prod

# Lấy code đã build từ stage builder sang - cách duy nhất chuyển dữ liệu
# giữa 2 stage riêng biệt
COPY --from=builder /app/dist ./dist

# Không EXPOSE port nào - service này chỉ kết nối ra Kafka (consumer/producer),
# không nhận request HTTP nào từ bên ngoài
CMD ["node", "dist/main"]
