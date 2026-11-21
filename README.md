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
