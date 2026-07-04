# StoryBook Agent — Guía estética

## Visión

La interfaz debe sentirse como un **menú de videojuego infantil colorido**, inspirado en *Shin Chan: Flipa en Colores* (NDS): divertida, saturada, con trazos gruesos y sensación de crayón / dibujo a mano. No es una landing SaaS ni un dashboard corporativo.

**Sensación buscada:** juguetona, confiada, un poco caótica a propósito, como si un niño hubiera montado la UI con pegatinas de colores.

**Referencias visuales**

- Menús del juego: bloques de color plano, bordes negros gruesos, sombras duras desplazadas.
- Dibujos del usuario coloreados con crayones: contornos marcados, rellenos vivos, sin degradados suaves.
- El libro interactivo es el centro de la experiencia; el resto de pantallas son “pasillos” hacia él.

---

## Principios

| Hacer | Evitar |
|---|---|
| Colores planos y saturados (rosa, cian, lima, naranja, amarillo) | Paletas apagadas, grises dominantes, glassmorphism |
| Bordes negros gruesos (`border-4 border-slate-900`) | Bordes finos, sombras difusas tipo Material |
| Sombras duras offset (`shadow-[6px_6px_0_#111827]`) | `shadow-lg`, blur, neumorphism |
| Esquinas muy redondeadas (`rounded-2xl` / `rounded-3xl`) | Esquinas rectas o pill minimalistas |
| Tipografía **black** / **extrabold** para títulos | Pesos light, interletraje corporativo |
| Fondo crema cálido `#fff5cf` | Fondos blancos fríos o gris `#f8fafc` |
| Animaciones cortas y con “bounce” (Framer `whileHover`) | Transiciones largas y sobrias |
| Pocos elementos por pantalla, grandes y claros | Landing densas tipo startup con muchas secciones |
| Iconos Lucide como apoyo, no como protagonistas | UI dominada por iconografía genérica |

---

## Paleta (Tailwind)

Usar estos tokens de forma consistente. No inventar nuevos acentos sin motivo.

| Rol | Clase | Uso |
|---|---|---|
| Fondo app | `bg-[#fff5cf]` | Todas las páginas |
| Tinta | `text-slate-900` | Texto principal |
| Tinta secundaria | `text-slate-700` | Párrafos |
| Borde / contorno | `border-slate-900` | Siempre grosor 3–4 |
| Acento 1 — acción principal | `bg-pink-400` | CTA principal, “continuar” |
| Acento 2 — acción secundaria | `bg-cyan-300` | Segunda opción, badges |
| Acento 3 — energía | `bg-orange-300` / `bg-orange-400` | Logo, highlights |
| Acento 4 — éxito / positivo | `bg-lime-300` / `bg-lime-400` | Confirmaciones, login |
| Superficie | `bg-white` | Tarjetas y formularios |
| Alerta / salir | `bg-orange-300` o `bg-red-400` | Solo diálogos destructivos |

**Regla de contraste:** texto siempre oscuro sobre fondos claros. No texto blanco sobre pasteles salvo excepciones puntuales.

---

## Componentes

### Botones

```text
rounded-3xl border-4 border-slate-900 px-7 py-4 text-lg font-black shadow-[6px_6px_0_#111827]
```

- Hover: `translateY(-4px)` (Framer `whileHover`), no cambiar color drásticamente.
- Disabled: `opacity-70`, sin quitar el borde.

### Tarjetas / paneles

```text
rounded-[2rem] border-4 border-slate-900 bg-white p-6 shadow-[8px_8px_0_#111827]
```

- Variantes de color solo en una cara (ej. `bg-cyan-100` para bloques informativos).
- **No** usar `backdrop-blur` ni fondos semitransparentes salvo necesidad extrema.

### Navbar

- En **nueva historia**: solo marca (logo + nombre), sin distracciones.
- En **dashboard**: marca + acciones de cuenta (API keys, logout).
- En **landing**: marca + login/registro; tono invitación, no corporativo.

### Diálogos (`ConfirmDialog`)

- Mismo lenguaje: borde grueso, fondo crema `#fff5cf`, sombra dura.
- Salir → tono naranja; eliminar → rojo.

---

## Tipografía

- Títulos hero: `text-5xl`–`text-7xl font-black leading-[0.95]`
- Subtítulos: `text-lg font-semibold text-slate-700`
- Labels formulario: `text-sm font-black uppercase tracking-wide`
- Sin fuentes serif ni monospace en UI (salvo código en docs).

---

## Motion

- Entrada: `opacity 0→1`, `y: 20→0`, duración ~0.5–0.6s.
- Botones: micro-elevación en hover.
- El libro (`story-book-stage`) mantiene su animación de paso de página; no competir con animaciones globales excesivas.

---

## Ilustraciones generadas (OpenAI)

El prompt de fondos (`backend/app/core/prompts/background_generator.txt`) debe alinearse con esta guía:

- Estilo **ilustración infantil con crayón / acuarela gruesa**, colores vivos.
- Composición horizontal, zona central legible para texto.
- **Sin** texto, marcos ni bordes en la imagen.
- Personajes y escenarios con contorno negro suave, rellenos planos (estética Shin-chan / cuento dibujado).

Al cambiar el prompt de imagen, actualizar también esta sección.

---

## Pantallas y jerarquía

| Ruta | Rol estético |
|---|---|
| `/` | Cartel de bienvenida del juego: poco texto, mucho color, CTAs grandes |
| `/dashboard` | Menú principal: 2–3 botones grandes, sin ruido |
| `/nueva-historia` | El libro es protagonista; UI mínima alrededor |
| `/mis-historias` | Lista simple; misma paleta, sin reinventar |
| `/login`, `/register` | Formulario en cartucho; arcoíris suave de fondo |

**Arcoíris de fondo:** `SoftRainbowBackground` en lobby (`/`, `/dashboard`, login/registro). Sin arcoíris en `/nueva-historia` ni `/mis-historias` para que el libro y las listas respiren.

---

## Anti-patrones (causas de degradación)

Estas decisiones **rompen** la identidad; evitarlas en PRs y refactors:

1. **Landing SaaS** — muchas secciones, grids de features, tono enterprise.
2. **Glassmorphism** — `backdrop-blur`, paneles `bg-white/70`.
3. **Arcoíris de fondo intensos o con blur en tarjetas** — usar `SoftRainbowBackground` solo en pantallas de lobby, con opacidad baja; las tarjetas siguen sólidas.
4. **Sutileza excesiva** — grises, sombras soft, bordes `border-gray-200`.
5. **Reutilizar patrones de otros proyectos** sin pasar por esta guía.
6. **Prompts de imagen genéricos** — “digital art”, “realistic”, “3D render”.

---

## Checklist antes de merge (frontend)

- [ ] ¿Fondo `#fff5cf`?
- [ ] ¿Bordes `border-4 border-slate-900`?
- [ ] ¿Sombra dura offset en tarjetas y botones?
- [ ] ¿Colores de acento de la paleta?
- [ ] ¿Títulos en `font-black`?
- [ ] ¿La pantalla se siente a juego infantil y no a startup?
- [ ] ¿El libro sigue siendo el foco en flujos de historia?

---

## Mantenimiento

- Cambios de estilo global → actualizar este archivo y `.cursor/rules/frontend-aesthetic.mdc`.
- Nuevos prompts de imagen → sección *Ilustraciones generadas*.
- Tokens reutilizables → `frontend/src/styles/game-ui.css` y componentes en `frontend/src/components/game/`.
