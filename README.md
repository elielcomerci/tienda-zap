# ZAP Tienda

E-commerce completo minimalista para imprenta/gráfica.
Creado con Next.js 15, Prisma 7, Auth.js v5 y Tailwind CSS.

## Features principales
- Catálogo público con categorías
- Carrito de compras con persistencia local
- Checkout con MercadoPago, Transferencia o Efectivo
- Panel de Administración protegido
- CRUD de Productos (con fotos en Vercel Blob)
- CRUD de Categorías
- Gestión de Órdenes y estados
- Dashboard con métricas

## Requisitos previos
- Node.js 18+
- Base de datos PostgreSQL (ej. Neon)
- Cuenta en MercadoPago (Access Token)
- Proyecto en Vercel con Vercel Blob habilitado

## Instalación local

1. Clonar el repositorio:
   ```bash
   git clone <repo-url>
   cd zap-tienda
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   Copiar `.env.example` a `.env.local` y completar todos los valores:
   ```bash
   cp .env.example .env.local
   ```
   > **Nota:** Para `NEXTAUTH_SECRET` podés usar `openssl rand -base64 32`.

4. Inicializar la base de datos y crear el Admin:
   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```
   > El usuario admin por defecto se configura en `.env.local` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Si no se configuran, usa `admin@zap.com.ar` y `cambiar_esta_clave`.

5. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Deploy a Vercel

1. Subir el código a GitHub.
2. Importar el proyecto en Vercel.
3. En la sección **Storage** del proyecto en Vercel, crear o linkear un store de tipo **Blob** (esto auto-configura `BLOB_READ_WRITE_TOKEN`).
4. Configurar el resto de las variables de entorno en Vercel (`DATABASE_URL`, `NEXTAUTH_SECRET`, variables de MP, etc.).
5. Configurar la URL en MercadoPago para recibir webhooks apuntando a:
   `https://tu-dominio.com/api/checkout/webhook`
6. Deployar.

## Sobre las imágenes
Las imágenes se suben de forma segura a Vercel Blob desde el admin. Tené en cuenta el límite de la capa gratuita de Vercel Blob (250MB / 100K ops).
