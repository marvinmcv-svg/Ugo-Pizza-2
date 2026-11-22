# Ugo's Pizza · sitio + Ugo·IA

Sitio de marketing y pedidos para **Ugo's Pizza** (Santa Cruz de la Sierra, Bolivia), con **Ugo·IA**, un asistente de pedidos con herramientas y modo voz. Los pedidos salen por WhatsApp a la sucursal elegida (o a La Scoobyneta, el delivery de Ugo's).

Sitio estático sin build + una función serverless de Vercel (`/api/ugoia`). Node ≥ 20.

## Qué tiene

- **Ticker de promos**, header con menú en píldora (una fila al hacer scroll), menú hamburguesa en móvil.
- **Carrusel de promos**: combo 2 Jamoneitor + Pepsi 2 L (Bs 100), Jamoneitor a Bs 35 por La Scoobyneta (sólo en noviembre, se oculta solo el 1 de diciembre) y la Cheeseburguer con su reel.
- **"¿Dónde querés tu pedido?"**: delivery/recojo + sucursal con estado en vivo → embudo de WhatsApp.
- **La carta gira**: una mesa giratoria de madera con las 18 pizzas. Arrastrá, deslizá o usá las flechas; tocá la pizza para ver ingredientes, alérgenos (consultar en sucursal), tamaño, combo y "Añadir al pedido".
- Carta completa con pestañas, 9 combos con foto, destacados, reels, embudo de 4 pasos con vista previa del WhatsApp, 9 sucursales con horario en vivo, franquicias, historia, Instagram, "trabajá con nosotros", footer con menús desplegables.
- **Carrito** compartido entre la web y Ugo·IA (`localStorage`).
- **Ugo·IA**: herramientas deterministas (el modelo nunca calcula precios), confirmación forzada por el servidor, Mi Pedido ("lo de siempre"), Entrega con Pin, Sigue tu Pizza (versión honesta), voz con Web Speech API.

## Estructura

```
index.html          estructura + SEO (Open Graph, schema.org Restaurant)
css/styles.css      sistema de diseño (tokens de marca arriba, con de dónde salió cada color)
js/data.js          TODO el contenido + catalog() — lo usan la web Y las herramientas del asistente
js/app.js           render, carrusel, mesa giratoria, carrito, embudo, horarios en vivo, chat + voz
api/ugoia.js        endpoint del asistente: loop de herramientas, stream NDJSON, guardas del servidor
api/_tools.js       herramientas deterministas (menú, carrito, promos, pedido, derivación) + schemas
api/_prompt.js      prompt del sistema + contexto en vivo
api/_persona.js     frases propias de Ugo·IA + easter eggs
tests/tools.test.js tests de las herramientas (node:test)
assets/             fotos, reels y marca descargados de las redes y la web de Ugo's (nada generado)
```

## Back office (CRM) · `/crm`

Panel interno para operar la cadena. No está enlazado desde la web pública y tiene `noindex`.

| Módulo | Qué hace |
|---|---|
| Panel | Ventas, pedidos y ticket de hoy vs. la semana pasada, ventas por hora, 14 días, sucursales, canales, lo que más sale, alertas (pedidos atrasados, stock bajo, cobros, leads) |
| Pedidos | Tablero Nuevo → Confirmado → En horno → Listo → En camino → Entregado con timers y SLA, arrastrar y soltar, detalle, cobro, ticket imprimible, aviso al cliente por WhatsApp, historial + CSV |
| Nuevo pedido | Punto de venta: cliente (busca o crea), sucursal, canal, servicio, productos, cupones, pago, nota |
| Cocina | Pantalla de cocina por sucursal (tocar para avanzar, pantalla completa) |
| Delivery | Para despachar, en camino, repartidores y asignación |
| Clientes | Ficha, historial, gasto, segmentos (VIP, frecuente, ocasional, nuevo, dormido), puntos y canje, etiquetas, notas, CSV |
| Personal | Equipo por sucursal, turnos de la semana con horas y costo, entrada/salida |
| Inventario | Stock por sucursal con días de cobertura, recetas y costos/márgenes, descuento automático al entrar al horno, compras sugeridas y órdenes, mermas, conteo físico |
| Marketing | Campañas de WhatsApp por segmento, cupones, rendimiento de promos y combos, reglas de puntos |
| Reportes | Por período y sucursal: ventas, ticket, margen, mapa de calor día × hora, canales, pagos, productos, CSV |
| Leads | Formularios de franquicia de la web |

- Archivos: `crm.html`, `css/crm.css`, `js/crm/store.js` (datos), `js/crm/ui.js` (componentes y gráficos), `js/crm/app.js` (pantallas).
- La carta, precios y sucursales salen de `js/data.js` (la misma fuente que la web).
- **Datos:** hoy viven en el navegador (`localStorage`), con datos de demostración la primera vez ("Empezar en limpio" los borra). Los pedidos y leads de la web entran solos **si se hacen en el mismo navegador**. Para varias sucursales y dispositivos a la vez hace falta una base de datos: todo pasa por `load()`/`save()` en `store.js`, que es lo único a reemplazar. También hace falta login real antes de usarlo con datos de clientes.
- Recetas y costos de insumos son estimaciones editables (Inventario → Recetas y costos).

## Correr local

```bash
npm install
npm test
npx vercel dev
```

Sin clave, el chat muestra "Ugo·IA se está preparando 🛠️" y el resto del sitio funciona igual.

## Variables de entorno (Vercel → Project → Settings → Environment Variables)

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Clave de Claude (si usás Anthropic) |
| `UGOIA_MODEL` / `UGOIA_VOICE_MODEL` | Modelos de Claude opcionales (por defecto `claude-sonnet-5-5` / `claude-haiku-5-5`) |
| `NVIDIA_API_KEY` | Clave de NVIDIA NIM (si usás NVIDIA) |
| `UGOIA_NVIDIA_MODEL` | Modelo NIM opcional (tiene que soportar tool calling; por defecto `nvidia/nemotron-3-ultra-550b-a55b`) |
| `UGOIA_PROVIDER` | Opcional, fuerza `anthropic` o `nvidia` |

Después de agregar la clave, **redeploy**.

## Cómo actualizar contenido

Todo está en `js/data.js`, con la fuente de cada dato al lado. Precios, combos, sucursales, horarios y la promo del mes se cambian ahí y la web y Ugo·IA se actualizan juntas.

- **Promo del mes** → `yapa` (`from` / `until`). Fuera de esas fechas desaparece del carrusel, la carta y el asistente.
- **Horarios** → `hours` (iguales para todas las sucursales, como en ugospizzas.com/ubicaciones).
- **Promos por día de la semana** → `weekly` (vacío hoy: la sección se oculta sola).

## Falta información del dueño

Ver la lista "needs owner input" en el reporte de entrega: costo/zonas de delivery, medios de pago, alérgenos, otros tamaños y precio de gaseosas sueltas, horario de La Scoobyneta, los 2 sabores que faltan para "más de 20", año de fundación.

## Roadmap (necesita backend)

Base de datos y Mi Perfil, POS/cocina, bot de WhatsApp Business, pagos (QR), seguimiento en vivo, recompensas, agente telefónico, pizza mitad y mitad.
