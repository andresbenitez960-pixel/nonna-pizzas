# NONNA PIZZAS — Opción B: Sistema Profesional

## Qué incluye
- Página pública de pedidos.
- Panel de administración en `/admin`.
- Estado ABIERTO/CERRADO visible en la web.
- Horario editable.
- WhatsApp editable desde administración.
- Instagram editable.
- Coordenadas del local editables y enlace a Google Maps.
- Delivery configurable.
- Extra por pizza ASADA configurable.
- Extra por BORDE RELLENO configurable.
- Productos editables: nombre, categoría, descripción, precio, foto, activo/destacado.
- Alta de nuevos productos.
- Categorías: PIZZAS, ESPECIALES, BEBIDAS, TRAGOS y PREPIZZAS.
- Prepizzas: enteras, sin porciones, sin selector de asada/prelista y sin extras de pizza.
- Mitad y mitad: dos sabores de pizzas.
- Tamaños de pizza: solamente mitad y entera.
- Pizzas ESPECIALES: siempre con borde relleno incluido; permiten elegir prelista/sin asar o asada y tamaño mitad o entera.
- Delivery con dirección + ubicación GPS del cliente.
- Pedido enviado a WhatsApp.

## Requisitos
Instalar Node.js 20+.

## Instalación
1. Abrir una terminal dentro de esta carpeta.
2. Ejecutar:
   npm install
3. Ejecutar:
   npm start
4. Abrir:
   http://localhost:3000
5. Panel:
   http://localhost:3000/admin

## Acceso inicial
Usuario: admin
Contraseña: cambiar-esta-clave

IMPORTANTE: antes de publicar en Internet, cambiar ADMIN_PASSWORD y SESSION_SECRET mediante variables de entorno.

Windows PowerShell:
$env:ADMIN_PASSWORD="TU_CLAVE_SEGURA"
$env:SESSION_SECRET="UNA_CLAVE_LARGA_Y_ALEATORIA"
npm start

## Fotos
Desde el panel de administración:
Productos -> Editar / Nuevo producto -> Foto real -> Guardar.

Las fotos se guardan en public/uploads.

## Productos y precios
Los precios base de las pizzas existentes son los acordados:
Muzzarella 8000
Jamón y Morrón 10000
Choclo 10000
Salame 10000
Calabresa 10000
Choclo y Salame 10000
Jamón y Choclo 10000
Strogonoff de Pollo con borde relleno 18000
Calabresa con Borde Relleno 15000
Choclo y Salame con Borde Relleno 15000
Strogonoff de Carne con Borde Relleno 18000

Por defecto:
Asada +3000
Borde relleno +3000
Delivery +3000

## Importante sobre producción
Este proyecto usa SQLite y almacenamiento local de archivos. Para publicar en un hosting, hay que elegir un proveedor que conserve el disco o migrar imágenes y base de datos a un servicio administrado. También conviene cambiar la sesión por una configuración de producción y usar HTTPS.

## Instagram
El administrador puede pegar la URL completa de su Instagram, por ejemplo:
https://www.instagram.com/tu_cuenta/

## GPS
El cliente debe autorizar la ubicación en su navegador. En producción, la geolocalización funciona de forma confiable con HTTPS (o localhost durante desarrollo).


## Sincronización de la página pública

La página pública consulta `/api/public-config` sin caché y se sincroniza automáticamente cada 10 segundos. Los cambios realizados desde el panel de administración en estado abierto/cerrado, horarios, precios, productos y fotografías se reflejan sin modificar el código.

El servidor utiliza la variable `PORT` (por defecto `3000`). Ejecutar con `npm start`.
