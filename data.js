// Repertorio de ejercicios y plantillas de rutinas.
// Para agregar ejercicios nuevos, sumalos a EXERCISES con un id único.

const MUSCLES = {
  chest: 'Pecho',
  shoulders: 'Hombros',
  triceps: 'Tríceps',
  back: 'Espalda',
  rearDelts: 'Deltoide posterior',
  biceps: 'Bíceps',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  calves: 'Gemelos',
  core: 'Core',
};

// compound: ejercicio multiarticular (va primero en la rutina)
// sets / reps: objetivo sugerido
const EXERCISES = [
  // Pecho
  { id: 'bench', name: 'Press banca con barra', muscle: 'chest', compound: true, sets: 4, reps: '6-8' },
  { id: 'incline-db', name: 'Press inclinado con mancuernas', muscle: 'chest', compound: true, sets: 3, reps: '8-10' },
  { id: 'db-bench', name: 'Press banca con mancuernas', muscle: 'chest', compound: true, sets: 3, reps: '8-10' },
  { id: 'incline-bb', name: 'Press inclinado con barra', muscle: 'chest', compound: true, sets: 4, reps: '6-8' },
  { id: 'dips', name: 'Fondos en paralelas', muscle: 'chest', compound: true, sets: 3, reps: '8-12' },
  { id: 'pushups', name: 'Flexiones', muscle: 'chest', compound: true, sets: 3, reps: '12-20' },
  { id: 'db-fly', name: 'Aperturas con mancuernas', muscle: 'chest', sets: 3, reps: '10-12' },
  { id: 'cable-fly', name: 'Cruce de poleas', muscle: 'chest', sets: 3, reps: '12-15' },
  { id: 'pec-deck', name: 'Pec deck', muscle: 'chest', sets: 3, reps: '12-15' },

  // Hombros
  { id: 'ohp', name: 'Press militar con barra', muscle: 'shoulders', compound: true, sets: 4, reps: '6-8' },
  { id: 'db-shoulder', name: 'Press de hombro con mancuernas', muscle: 'shoulders', compound: true, sets: 3, reps: '8-10' },
  { id: 'arnold', name: 'Press Arnold', muscle: 'shoulders', compound: true, sets: 3, reps: '8-12' },
  { id: 'lateral', name: 'Elevaciones laterales', muscle: 'shoulders', sets: 3, reps: '12-15' },
  { id: 'cable-lateral', name: 'Elevaciones laterales en polea', muscle: 'shoulders', sets: 3, reps: '12-15' },
  { id: 'front-raise', name: 'Elevaciones frontales', muscle: 'shoulders', sets: 3, reps: '10-12' },

  // Tríceps
  { id: 'skull', name: 'Press francés', muscle: 'triceps', sets: 3, reps: '8-12' },
  { id: 'pushdown', name: 'Extensión de tríceps en polea', muscle: 'triceps', sets: 3, reps: '10-15' },
  { id: 'oh-ext', name: 'Extensión sobre la cabeza', muscle: 'triceps', sets: 3, reps: '10-12' },
  { id: 'cgbp', name: 'Press cerrado', muscle: 'triceps', compound: true, sets: 3, reps: '6-10' },
  { id: 'kickback', name: 'Patada de tríceps', muscle: 'triceps', sets: 3, reps: '12-15' },
  { id: 'bench-dips', name: 'Fondos en banco', muscle: 'triceps', sets: 3, reps: '10-15' },

  // Espalda
  { id: 'pullup', name: 'Dominadas', muscle: 'back', compound: true, sets: 4, reps: '6-10' },
  { id: 'bb-row', name: 'Remo con barra', muscle: 'back', compound: true, sets: 4, reps: '6-8' },
  { id: 'lat-pd', name: 'Jalón al pecho', muscle: 'back', compound: true, sets: 3, reps: '8-12' },
  { id: 'db-row', name: 'Remo con mancuerna', muscle: 'back', compound: true, sets: 3, reps: '8-12' },
  { id: 'cable-row', name: 'Remo sentado en polea', muscle: 'back', compound: true, sets: 3, reps: '10-12' },
  { id: 'machine-row', name: 'Remo en máquina', muscle: 'back', compound: true, sets: 3, reps: '10-12' },
  { id: 'deadlift', name: 'Peso muerto', muscle: 'back', compound: true, sets: 3, reps: '4-6' },
  { id: 'pullover', name: 'Pullover en polea', muscle: 'back', sets: 3, reps: '12-15' },

  // Deltoide posterior
  { id: 'facepull', name: 'Face pull', muscle: 'rearDelts', sets: 3, reps: '12-15' },
  { id: 'rear-fly', name: 'Pájaros con mancuernas', muscle: 'rearDelts', sets: 3, reps: '12-15' },
  { id: 'rev-pec', name: 'Reverse pec deck', muscle: 'rearDelts', sets: 3, reps: '12-15' },

  // Bíceps
  { id: 'bb-curl', name: 'Curl con barra', muscle: 'biceps', sets: 3, reps: '8-12' },
  { id: 'db-curl', name: 'Curl con mancuernas', muscle: 'biceps', sets: 3, reps: '10-12' },
  { id: 'hammer', name: 'Curl martillo', muscle: 'biceps', sets: 3, reps: '10-12' },
  { id: 'preacher', name: 'Curl predicador', muscle: 'biceps', sets: 3, reps: '10-12' },
  { id: 'cable-curl', name: 'Curl en polea', muscle: 'biceps', sets: 3, reps: '12-15' },
  { id: 'incline-curl', name: 'Curl inclinado', muscle: 'biceps', sets: 3, reps: '10-12' },

  // Cuádriceps
  { id: 'squat', name: 'Sentadilla con barra', muscle: 'quads', compound: true, sets: 4, reps: '5-8' },
  { id: 'leg-press', name: 'Prensa', muscle: 'quads', compound: true, sets: 4, reps: '8-12' },
  { id: 'bulgarian', name: 'Sentadilla búlgara', muscle: 'quads', compound: true, sets: 3, reps: '8-10' },
  { id: 'hack', name: 'Sentadilla hack', muscle: 'quads', compound: true, sets: 3, reps: '8-12' },
  { id: 'goblet', name: 'Sentadilla goblet', muscle: 'quads', compound: true, sets: 3, reps: '10-12' },
  { id: 'lunges', name: 'Zancadas', muscle: 'quads', compound: true, sets: 3, reps: '10-12' },
  { id: 'leg-ext', name: 'Extensión de cuádriceps', muscle: 'quads', sets: 3, reps: '12-15' },

  // Isquios
  { id: 'rdl', name: 'Peso muerto rumano', muscle: 'hamstrings', compound: true, sets: 3, reps: '8-10' },
  { id: 'sldl', name: 'Peso muerto piernas rígidas', muscle: 'hamstrings', compound: true, sets: 3, reps: '8-10' },
  { id: 'good-morning', name: 'Buenos días', muscle: 'hamstrings', compound: true, sets: 3, reps: '8-10' },
  { id: 'lying-curl', name: 'Curl femoral tumbado', muscle: 'hamstrings', sets: 3, reps: '10-12' },
  { id: 'seated-curl', name: 'Curl femoral sentado', muscle: 'hamstrings', sets: 3, reps: '10-12' },

  // Glúteos
  { id: 'hip-thrust', name: 'Hip thrust', muscle: 'glutes', compound: true, sets: 3, reps: '8-12' },
  { id: 'glute-bridge', name: 'Puente de glúteo', muscle: 'glutes', sets: 3, reps: '12-15' },
  { id: 'cable-kick', name: 'Patada de glúteo en polea', muscle: 'glutes', sets: 3, reps: '12-15' },
  { id: 'abduction', name: 'Abducción en máquina', muscle: 'glutes', sets: 3, reps: '15-20' },

  // Gemelos
  { id: 'standing-calf', name: 'Elevación de talones de pie', muscle: 'calves', sets: 4, reps: '10-15' },
  { id: 'seated-calf', name: 'Elevación de talones sentado', muscle: 'calves', sets: 4, reps: '12-15' },
  { id: 'press-calf', name: 'Gemelos en prensa', muscle: 'calves', sets: 4, reps: '12-15' },

  // Core
  { id: 'plank', name: 'Plancha (segundos)', muscle: 'core', sets: 3, reps: '30-60' },
  { id: 'side-plank', name: 'Plancha lateral (segundos)', muscle: 'core', sets: 3, reps: '30-45' },
  { id: 'cable-crunch', name: 'Crunch en polea', muscle: 'core', sets: 3, reps: '12-15' },
  { id: 'hanging-raise', name: 'Elevación de piernas colgado', muscle: 'core', sets: 3, reps: '10-15' },
  { id: 'ab-wheel', name: 'Rueda abdominal', muscle: 'core', sets: 3, reps: '8-12' },
  { id: 'russian-twist', name: 'Russian twist', muscle: 'core', sets: 3, reps: '20' },
];

// Cada rutina define cuántos ejercicios elegir de cada grupo muscular.
const ROUTINES = {
  push: { name: 'Push', desc: 'Pecho, hombros y tríceps', slots: [['chest', 2], ['shoulders', 2], ['triceps', 2]] },
  pull: { name: 'Pull', desc: 'Espalda y bíceps', slots: [['back', 3], ['rearDelts', 1], ['biceps', 2]] },
  legs: { name: 'Piernas', desc: 'Cuádriceps, isquios, glúteos', slots: [['quads', 2], ['hamstrings', 2], ['glutes', 1], ['calves', 1]] },
  upper: { name: 'Torso', desc: 'Todo el tren superior', slots: [['chest', 2], ['back', 2], ['shoulders', 1], ['biceps', 1], ['triceps', 1]] },
  full: { name: 'Full Body', desc: 'Cuerpo completo', slots: [['quads', 1], ['chest', 1], ['back', 1], ['hamstrings', 1], ['shoulders', 1], ['core', 1]] },
  arms: { name: 'Brazos', desc: 'Bíceps, tríceps y hombro', slots: [['biceps', 3], ['triceps', 3], ['shoulders', 1]] },
  core: { name: 'Core', desc: 'Abdomen y zona media', slots: [['core', 4]] },
  free: { name: 'Libre', desc: 'Elegís vos los ejercicios', slots: [] },
};

const SPORTS = ['Fútbol', 'Correr', 'Caminata', 'Ciclismo', 'Natación', 'Pádel', 'Tenis', 'Básquet', 'Vóley', 'Yoga / Movilidad', 'Artes marciales', 'Otro'];
