#!/bin/sh
set -e

echo "==> Running prisma db push..."
DATABASE_URL="${DATABASE_URL}" npx prisma db push --skip-generate

echo "==> Starting Next.js..."
exec node node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000
