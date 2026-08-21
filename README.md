# TEC CRM

Sistema de gestión de proyectos con tableros Kanban, responsables de tareas,
detalles enriquecidos y diagramas Excalidraw persistentes.

## Requisitos

- PHP 8.3 o superior con `pdo_pgsql` habilitado
- Composer 2
- Node.js 20 o superior
- npm
- Una base PostgreSQL local o un proyecto de Neon

## Instalación local

```bash
composer install
copy .env.example .env
php artisan key:generate
npm install
npm run build
```

En macOS o Linux, sustituir `copy` por `cp`.

Después, editar `.env` y agregar la conexión real:

```dotenv
APP_NAME="TEC CRM"
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_SSLMODE=require
DB_URL="postgresql://USER:PASSWORD@PROJECT-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

La URL anterior es sólo un patrón. Las credenciales reales no deben guardarse
en Git, tickets, documentación ni canales públicos.

Con la conexión configurada:

```bash
php artisan migrate
php artisan serve
```

La aplicación estará disponible en `http://localhost:8000`. Con Laravel Herd,
se puede usar directamente el dominio asignado al directorio del proyecto.

Para desarrollo con recarga automática:

```bash
npm run dev
```

## Trabajo en equipo con Neon

La aplicación corre en cada computadora, pero los datos viven en Neon. Si todos
reciben la misma `DB_URL`, todos estarán trabajando sobre la misma base de datos.

Recomendación de ramas en Neon:

- `production`: datos reales; sólo recibe migraciones durante despliegues.
- `development`: integración compartida por el equipo.
- Una rama personal por desarrollador cuando se necesite probar migraciones o
  cambios destructivos.

En una base compartida:

- Ejecutar `php artisan migrate`; Laravel sólo aplica migraciones pendientes.
- No ejecutar `php artisan migrate:fresh`, `db:wipe` ni `migrate:refresh`.
- No ejecutar `php artisan db:seed` salvo que el equipo lo haya acordado.
- Designar a una persona o al pipeline para aplicar migraciones nuevas.

El endpoint con `-pooler` es adecuado para el uso normal de la aplicación. Para
operaciones administrativas o migraciones delicadas se puede usar temporalmente
el endpoint directo proporcionado por Neon.

## Variables sensibles

`.env` está excluido por `.gitignore`. Para compartirlo, usar un administrador
de contraseñas o un canal privado. Cada entorno debe configurar como mínimo:

```dotenv
APP_KEY=
APP_URL=
DB_URL=
```

En producción también se debe usar:

```dotenv
APP_ENV=production
APP_DEBUG=false
SESSION_SECURE_COOKIE=true
```

Después de cambiar variables de entorno:

```bash
php artisan optimize:clear
```

## Comandos de verificación

```bash
php artisan test
vendor/bin/phpstan analyse --no-progress --memory-limit=512M
npm run lint:check
npm run types:check
npm run build
```

## Módulos principales

- Autenticación sin registro público
- Administración de usuarios y accesos
- Proyectos y miembros
- Tablero Kanban con drag and drop
- Tareas con múltiples responsables y texto enriquecido
- Diagramas Excalidraw con bibliotecas persistentes
- API autenticada mediante Sanctum
