# AppGym

App web para el celular para registrar entrenamientos de gimnasio y deportes. Funciona sin internet y guarda todo en el teléfono.

## Qué hace
- **Rutinas generadas**: elegís Push, Pull, Piernas, Torso, Full Body, Brazos, Core o Libre y te arma una rutina del repertorio. Con "🔀 Otra" la vuelve a generar.
- **Registro de series**: kg y reps por serie, ✓ para marcarla y timer de descanso automático. Muestra lo que hiciste la última vez.
- **Deportes y actividades**: fútbol, correr, pádel, etc. con duración, intensidad y notas.
- **Calendario**: muestra los días en que entrenaste (verde = gym, celeste = deporte) y el detalle de cada día.
- **Copia de seguridad**: exportar e importar desde Ajustes.

- **Ayuda visual**: tocá el nombre de un ejercicio (ⓘ) para ver fotos de cómo se hace y consejos de técnica.
- **Calistenia y Pliometría**: rutinas de peso corporal y de saltos/potencia.

Las fotos de los ejercicios son de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público, Unlicense).

## Archivos
- `data.js`: repertorio de ejercicios y rutinas (acá se agregan ejercicios nuevos)
- `app.js`: la lógica y las pantallas
- `styles.css`: el diseño
- `sw.js`: hace que funcione sin internet (subí `CACHE` a `appgym-v2`, `v3`… cuando cambies algo)

## Probar en la compu
```bash
python -m http.server 5173
```
Después abrí http://localhost:5173

## Instalar en el celular
Tiene que estar publicada con HTTPS (por ejemplo, GitHub Pages o Netlify). Abrí el link en el celular:
- **Android (Chrome)**: menú ⋮ → "Instalar app" / "Agregar a pantalla principal"
- **iPhone (Safari)**: Compartir → "Agregar a inicio"
