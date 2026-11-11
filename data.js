// Repertorio de ejercicios y plantillas de rutinas.
// Para agregar ejercicios nuevos, sumalos a EXERCISES con un id único.
//
// Campos:
//   compound  ejercicio multiarticular (va primero en la rutina)
//   sets/reps objetivo sugerido
//   tags      'cali' = sirve para Calistenia (solo peso corporal)
//   img       carpeta de free-exercise-db (dominio público) → img/ex/<img>/0.jpg y 1.jpg
//   tips      consejos de técnica que se ven al tocar el ejercicio

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
  plyoLower: 'Pliometría · piernas',
  plyoUpper: 'Pliometría · torso',
};

const EXERCISES = [
  // ── Pecho ──
  { id: 'bench', name: 'Press banca con barra', muscle: 'chest', compound: true, sets: 4, reps: '6-8', img: 'Barbell_Bench_Press_-_Medium_Grip',
    tips: ['Escápulas juntas y apretadas contra el banco', 'Bajá la barra a la línea de los pezones, codos a ~45°', 'Pies firmes en el piso, sin despegar la cola'] },
  { id: 'incline-db', name: 'Press inclinado con mancuernas', muscle: 'chest', compound: true, sets: 3, reps: '8-10', img: 'Incline_Dumbbell_Press',
    tips: ['Banco a 30-45°, no más (si no trabaja hombro)', 'Bajá hasta sentir estiramiento en el pecho', 'Subí juntando levemente las mancuernas arriba'] },
  { id: 'db-bench', name: 'Press banca con mancuernas', muscle: 'chest', compound: true, sets: 3, reps: '8-10', img: 'Dumbbell_Bench_Press',
    tips: ['Muñecas rectas sobre los codos', 'Bajada controlada de 2-3 segundos', 'No choques las mancuernas arriba'] },
  { id: 'incline-bb', name: 'Press inclinado con barra', muscle: 'chest', compound: true, sets: 4, reps: '6-8', img: 'Barbell_Incline_Bench_Press_-_Medium_Grip',
    tips: ['La barra baja a la parte alta del pecho', 'Codos un poco por debajo de la barra', 'Mantené el pecho alto todo el recorrido'] },
  { id: 'dips', name: 'Fondos en paralelas', muscle: 'chest', compound: true, sets: 3, reps: '8-12', tags: ['cali'], img: 'Dips_-_Chest_Version',
    tips: ['Inclinate un poco hacia adelante para enfocar pecho', 'Bajá hasta que el hombro quede a la altura del codo', 'Hombros abajo, lejos de las orejas'] },
  { id: 'pushups', name: 'Flexiones', muscle: 'chest', compound: true, sets: 3, reps: '12-20', tags: ['cali'], img: 'Pushups',
    tips: ['Cuerpo en línea recta: glúteos y abdomen apretados', 'Pecho casi toca el piso', 'Codos a ~45° del cuerpo, no abiertos en T'] },
  { id: 'decline-pushup', name: 'Flexiones declinadas', muscle: 'chest', compound: true, sets: 3, reps: '10-15', tags: ['cali'], img: 'Push-Ups_With_Feet_Elevated',
    tips: ['Pies en un banco o cajón', 'No dejes caer la cadera', 'Más altura = más trabajo de pecho alto y hombro'] },
  { id: 'db-fly', name: 'Aperturas con mancuernas', muscle: 'chest', sets: 3, reps: '10-12', img: 'Dumbbell_Flyes',
    tips: ['Codos levemente flexionados y fijos', 'Abrí como abrazando un barril', 'No bajes más allá de la línea del hombro'] },
  { id: 'cable-fly', name: 'Cruce de poleas', muscle: 'chest', sets: 3, reps: '12-15', img: 'Cable_Crossover',
    tips: ['Un pie adelante para estabilizar', 'Juntá las manos frente al pecho y apretá 1 segundo', 'Volvé lento, sentí el estiramiento'] },
  { id: 'pec-deck', name: 'Pec deck', muscle: 'chest', sets: 3, reps: '12-15', img: 'Butterfly',
    tips: ['Ajustá el asiento: manijas a la altura del pecho', 'Espalda pegada al respaldo', 'Apretá el pecho al cerrar, no empujes con los brazos'] },

  // ── Hombros ──
  { id: 'ohp', name: 'Press militar con barra', muscle: 'shoulders', compound: true, sets: 4, reps: '6-8', img: 'Standing_Military_Press',
    tips: ['Glúteos y abdomen firmes, sin arquear la espalda', 'La barra sube en línea recta, metiendo la cabeza al final', 'Agarre apenas más ancho que los hombros'] },
  { id: 'db-shoulder', name: 'Press de hombro con mancuernas', muscle: 'shoulders', compound: true, sets: 3, reps: '8-10', img: 'Dumbbell_Shoulder_Press',
    tips: ['Codos un poco adelante del cuerpo', 'Bajá hasta la altura de las orejas', 'No bloquees los codos de golpe arriba'] },
  { id: 'arnold', name: 'Press Arnold', muscle: 'shoulders', compound: true, sets: 3, reps: '8-12', img: 'Arnold_Dumbbell_Press',
    tips: ['Empezá con palmas hacia vos a la altura del mentón', 'Girá las palmas hacia afuera mientras subís', 'Movimiento fluido, sin impulso'] },
  { id: 'hspu', name: 'Flexiones en pino (contra la pared)', muscle: 'shoulders', compound: true, sets: 3, reps: '4-8', tags: ['cali'], img: 'Handstand_Push-Ups',
    tips: ['Manos a un palmo de la pared, abdomen apretado', 'Bajá controlado hasta que la cabeza roce el piso', 'Si no podés, empezá con flexiones pike'] },
  { id: 'pike-pushup', name: 'Flexiones pike', muscle: 'shoulders', compound: true, sets: 3, reps: '8-12', tags: ['cali'],
    tips: ['Cadera bien arriba, cuerpo en forma de V invertida', 'Bajá la cabeza hacia adelante de las manos', 'Pies en un banco para hacerlas más difíciles'] },
  { id: 'lateral', name: 'Elevaciones laterales', muscle: 'shoulders', sets: 3, reps: '12-15', img: 'Side_Lateral_Raise',
    tips: ['Subí hasta la altura del hombro, no más', 'Codos levemente flexionados, guían el movimiento', 'Peso liviano, sin balancear el cuerpo'] },
  { id: 'cable-lateral', name: 'Elevaciones laterales en polea', muscle: 'shoulders', sets: 3, reps: '12-15', img: 'Cable_Seated_Lateral_Raise',
    tips: ['La polea baja, cable por delante del cuerpo', 'Tensión constante: no descanses abajo', 'Subí hasta la altura del hombro'] },
  { id: 'front-raise', name: 'Elevaciones frontales', muscle: 'shoulders', sets: 3, reps: '10-12', img: 'Front_Dumbbell_Raise',
    tips: ['Subí hasta la altura de los ojos', 'Torso quieto, sin tirar hacia atrás', 'Bajá lento, 2-3 segundos'] },

  // ── Tríceps ──
  { id: 'skull', name: 'Press francés', muscle: 'triceps', sets: 3, reps: '8-12', img: 'EZ-Bar_Skullcrusher',
    tips: ['Codos fijos apuntando al techo', 'Bajá la barra hacia la frente, controlado', 'Solo se mueve el antebrazo'] },
  { id: 'pushdown', name: 'Extensión de tríceps en polea', muscle: 'triceps', sets: 3, reps: '10-15', img: 'Triceps_Pushdown',
    tips: ['Codos pegados al cuerpo', 'Extendé del todo y apretá abajo', 'No te inclines encima de la barra'] },
  { id: 'oh-ext', name: 'Extensión sobre la cabeza', muscle: 'triceps', sets: 3, reps: '10-12', img: 'Cable_Rope_Overhead_Triceps_Extension',
    tips: ['Codos cerca de la cabeza, apuntando adelante', 'Bajá detrás de la cabeza hasta estirar bien', 'Abdomen firme para no arquear la espalda'] },
  { id: 'cgbp', name: 'Press cerrado', muscle: 'triceps', compound: true, sets: 3, reps: '6-10', img: 'Close-Grip_Barbell_Bench_Press',
    tips: ['Agarre al ancho de los hombros (no más cerrado)', 'Codos pegados al torso al bajar', 'La barra baja a la parte baja del pecho'] },
  { id: 'diamond-pushup', name: 'Flexiones diamante', muscle: 'triceps', compound: true, sets: 3, reps: '8-15', tags: ['cali'], img: 'Push-Ups_-_Close_Triceps_Position',
    tips: ['Manos juntas formando un rombo bajo el pecho', 'Codos rozando las costillas', 'Si cuesta, apoyá las rodillas'] },
  { id: 'kickback', name: 'Patada de tríceps', muscle: 'triceps', sets: 3, reps: '12-15', img: 'Tricep_Dumbbell_Kickback',
    tips: ['Torso casi paralelo al piso', 'Brazo pegado al cuerpo, codo fijo', 'Extendé del todo y apretá 1 segundo'] },
  { id: 'bench-dips', name: 'Fondos en banco', muscle: 'triceps', sets: 3, reps: '10-15', tags: ['cali'], img: 'Bench_Dips',
    tips: ['Espalda cerca del banco', 'Bajá hasta codos a 90°, no más', 'Pies más lejos = más difícil'] },

  // ── Espalda ──
  { id: 'pullup', name: 'Dominadas', muscle: 'back', compound: true, sets: 4, reps: '6-10', tags: ['cali'], img: 'Pullups',
    tips: ['Empezá bajando los hombros (escápulas abajo)', 'Subí llevando el pecho a la barra', 'Bajá completo y controlado, sin balanceo'] },
  { id: 'chinup', name: 'Dominadas supinas', muscle: 'back', compound: true, sets: 3, reps: '6-10', tags: ['cali'], img: 'Chin-Up',
    tips: ['Palmas hacia vos, al ancho de los hombros', 'Mentón por encima de la barra', 'Más bíceps que la dominada normal'] },
  { id: 'inverted-row', name: 'Remo invertido (australiano)', muscle: 'back', compound: true, sets: 3, reps: '8-15', tags: ['cali'], img: 'Inverted_Row',
    tips: ['Cuerpo recto como tabla, talones apoyados', 'Llevá el pecho a la barra', 'Más horizontal = más difícil'] },
  { id: 'muscle-up', name: 'Muscle-up', muscle: 'back', sets: 3, reps: '2-5', tags: ['cali'], img: 'Muscle_Up',
    tips: ['Requiere dominadas explosivas al pecho primero', 'Tirá fuerte y pasá las muñecas por encima de la barra', 'Terminá con un fondo arriba'] },
  { id: 'bb-row', name: 'Remo con barra', muscle: 'back', compound: true, sets: 4, reps: '6-8', img: 'Bent_Over_Barbell_Row',
    tips: ['Torso a ~45°, espalda recta (nunca redondeada)', 'Llevá la barra al ombligo', 'Apretá las escápulas arriba'] },
  { id: 'lat-pd', name: 'Jalón al pecho', muscle: 'back', compound: true, sets: 3, reps: '8-12', img: 'Wide-Grip_Lat_Pulldown',
    tips: ['Pecho alto, leve inclinación hacia atrás', 'Bajá la barra a la parte alta del pecho', 'Pensá en llevar los codos al bolsillo'] },
  { id: 'db-row', name: 'Remo con mancuerna', muscle: 'back', compound: true, sets: 3, reps: '8-12', img: 'One-Arm_Dumbbell_Row',
    tips: ['Mano y rodilla apoyadas en el banco', 'Llevá la mancuerna hacia la cadera', 'Sin girar el torso'] },
  { id: 'cable-row', name: 'Remo sentado en polea', muscle: 'back', compound: true, sets: 3, reps: '10-12', img: 'Seated_Cable_Rows',
    tips: ['Espalda recta, sin balancearte', 'Llevá el agarre al abdomen', 'Pecho afuera y escápulas juntas al final'] },
  { id: 'machine-row', name: 'Remo en máquina', muscle: 'back', compound: true, sets: 3, reps: '10-12', img: 'Leverage_High_Row',
    tips: ['Pecho apoyado en el respaldo', 'Tirá con los codos, no con las manos', 'Pausa de 1 segundo atrás'] },
  { id: 'deadlift', name: 'Peso muerto', muscle: 'back', compound: true, sets: 3, reps: '4-6', img: 'Barbell_Deadlift',
    tips: ['Barra pegada a las piernas todo el recorrido', 'Espalda neutra: pecho arriba, sin redondear', 'Empujá el piso con las piernas y extendé la cadera'] },
  { id: 'pullover', name: 'Pullover en polea', muscle: 'back', sets: 3, reps: '12-15', img: 'Straight-Arm_Dumbbell_Pullover',
    tips: ['Brazos casi rectos todo el tiempo', 'Movimiento en arco desde arriba hasta los muslos', 'Sentí el trabajo en los dorsales'] },

  // ── Deltoide posterior ──
  { id: 'facepull', name: 'Face pull', muscle: 'rearDelts', sets: 3, reps: '12-15', img: 'Face_Pull',
    tips: ['Polea a la altura de la cara, con cuerda', 'Tirá hacia la frente separando las manos', 'Codos altos, terminá con pulgares atrás'] },
  { id: 'rear-fly', name: 'Pájaros con mancuernas', muscle: 'rearDelts', sets: 3, reps: '12-15', img: 'Reverse_Flyes',
    tips: ['Torso inclinado casi paralelo al piso', 'Abrí los brazos hacia los costados', 'Peso liviano, sin usar impulso'] },
  { id: 'rev-pec', name: 'Reverse pec deck', muscle: 'rearDelts', sets: 3, reps: '12-15', img: 'Reverse_Machine_Flyes',
    tips: ['Pecho contra el respaldo', 'Brazos casi rectos, abrí hacia atrás', 'No juntes las escápulas de más'] },

  // ── Bíceps ──
  { id: 'bb-curl', name: 'Curl con barra', muscle: 'biceps', sets: 3, reps: '8-12', img: 'Barbell_Curl',
    tips: ['Codos fijos a los costados', 'Sin balancear el torso', 'Bajá completo hasta estirar el brazo'] },
  { id: 'db-curl', name: 'Curl con mancuernas', muscle: 'biceps', sets: 3, reps: '10-12', img: 'Dumbbell_Bicep_Curl',
    tips: ['Girá la palma hacia arriba al subir', 'Codos quietos', 'Bajada lenta de 2-3 segundos'] },
  { id: 'hammer', name: 'Curl martillo', muscle: 'biceps', sets: 3, reps: '10-12', img: 'Hammer_Curls',
    tips: ['Palmas mirándose (agarre neutro)', 'Trabaja bíceps y antebrazo', 'Sin balanceo'] },
  { id: 'preacher', name: 'Curl predicador', muscle: 'biceps', sets: 3, reps: '10-12', img: 'Preacher_Curl',
    tips: ['Axilas apoyadas arriba del banco', 'No estires de golpe abajo (cuidá el codo)', 'Apretá arriba 1 segundo'] },
  { id: 'cable-curl', name: 'Curl en polea', muscle: 'biceps', sets: 3, reps: '12-15', img: 'Standing_Biceps_Cable_Curl',
    tips: ['Codos pegados al cuerpo', 'Tensión constante todo el recorrido', 'Controlá la bajada'] },
  { id: 'incline-curl', name: 'Curl inclinado', muscle: 'biceps', sets: 3, reps: '10-12', img: 'Incline_Dumbbell_Curl',
    tips: ['Banco a ~45°, brazos colgando atrás del torso', 'Gran estiramiento abajo', 'Peso moderado'] },

  // ── Cuádriceps ──
  { id: 'squat', name: 'Sentadilla con barra', muscle: 'quads', compound: true, sets: 4, reps: '5-8', img: 'Barbell_Full_Squat',
    tips: ['Pies al ancho de hombros, puntas un poco afuera', 'Rodillas siguen la dirección de los pies', 'Bajá al menos hasta muslos paralelos, pecho arriba'] },
  { id: 'leg-press', name: 'Prensa', muscle: 'quads', compound: true, sets: 4, reps: '8-12', img: 'Leg_Press',
    tips: ['Espalda baja pegada al respaldo', 'No bloquees las rodillas arriba', 'Bajá hasta ~90° sin despegar la cola'] },
  { id: 'bulgarian', name: 'Sentadilla búlgara', muscle: 'quads', compound: true, sets: 3, reps: '8-10', tags: ['cali'], img: 'Split_Squat_with_Dumbbells',
    tips: ['Pie de atrás apoyado en un banco', 'Bajá vertical, la rodilla de atrás casi toca el piso', 'Peso en el talón de la pierna de adelante'] },
  { id: 'hack', name: 'Sentadilla hack', muscle: 'quads', compound: true, sets: 3, reps: '8-12', img: 'Hack_Squat',
    tips: ['Espalda pegada al respaldo', 'Pies al medio de la plataforma', 'Bajada controlada y profunda'] },
  { id: 'goblet', name: 'Sentadilla goblet', muscle: 'quads', compound: true, sets: 3, reps: '10-12', img: 'Goblet_Squat',
    tips: ['Mancuerna pegada al pecho', 'Codos entre las rodillas al bajar', 'Torso erguido'] },
  { id: 'pistol', name: 'Sentadilla pistol', muscle: 'quads', compound: true, sets: 3, reps: '4-8', tags: ['cali'], img: 'Kettlebell_Pistol_Squat',
    tips: ['Pierna libre estirada adelante', 'Brazos al frente para equilibrar', 'Empezá agarrado a algo o bajando a un banco'] },
  { id: 'lunges', name: 'Zancadas', muscle: 'quads', compound: true, sets: 3, reps: '10-12', tags: ['cali'], img: 'Bodyweight_Walking_Lunge',
    tips: ['Paso largo, torso derecho', 'Ambas rodillas a ~90° abajo', 'La rodilla de adelante no pasa mucho la punta del pie'] },
  { id: 'leg-ext', name: 'Extensión de cuádriceps', muscle: 'quads', sets: 3, reps: '12-15', img: 'Leg_Extensions',
    tips: ['Rodilla alineada con el eje de la máquina', 'Apretá arriba 1 segundo', 'Bajá lento'] },

  // ── Isquiotibiales ──
  { id: 'rdl', name: 'Peso muerto rumano', muscle: 'hamstrings', compound: true, sets: 3, reps: '8-10', img: 'Romanian_Deadlift',
    tips: ['Rodillas apenas flexionadas y fijas', 'Llevá la cadera atrás, barra pegada a las piernas', 'Bajá hasta sentir estiramiento, espalda recta'] },
  { id: 'sldl', name: 'Peso muerto piernas rígidas', muscle: 'hamstrings', compound: true, sets: 3, reps: '8-10', img: 'Stiff-Legged_Barbell_Deadlift',
    tips: ['Piernas casi rectas', 'Espalda neutra todo el tiempo', 'Peso moderado, mucho estiramiento'] },
  { id: 'good-morning', name: 'Buenos días', muscle: 'hamstrings', compound: true, sets: 3, reps: '8-10', img: 'Good_Morning',
    tips: ['Barra sobre los trapecios', 'Inclinate llevando la cadera atrás', 'Espalda recta, peso liviano'] },
  { id: 'nordic', name: 'Curl nórdico', muscle: 'hamstrings', compound: true, sets: 3, reps: '4-8', tags: ['cali'],
    tips: ['Tobillos sujetos (compañero o barra)', 'Bajá lo más lento posible con el cuerpo recto', 'Ayudate con las manos para volver'] },
  { id: 'lying-curl', name: 'Curl femoral tumbado', muscle: 'hamstrings', sets: 3, reps: '10-12', img: 'Lying_Leg_Curls',
    tips: ['Cadera pegada al banco', 'Llevá los talones a la cola', 'Bajada controlada'] },
  { id: 'seated-curl', name: 'Curl femoral sentado', muscle: 'hamstrings', sets: 3, reps: '10-12', img: 'Seated_Leg_Curl',
    tips: ['Rodilla alineada con el eje', 'Traba de muslo bien ajustada', 'Pausa abajo 1 segundo'] },

  // ── Glúteos ──
  { id: 'hip-thrust', name: 'Hip thrust', muscle: 'glutes', compound: true, sets: 3, reps: '8-12', img: 'Barbell_Hip_Thrust',
    tips: ['Espalda alta apoyada en el banco', 'Mentón al pecho, empujá con los talones', 'Arriba: cuerpo recto y glúteos apretados'] },
  { id: 'glute-bridge', name: 'Puente de glúteo', muscle: 'glutes', sets: 3, reps: '12-15', tags: ['cali'], img: 'Butt_Lift_Bridge',
    tips: ['Talones cerca de la cola', 'Subí la cadera apretando glúteos', 'No arquees la espalda baja'] },
  { id: 'sl-bridge', name: 'Puente de glúteo a una pierna', muscle: 'glutes', sets: 3, reps: '10-12', tags: ['cali'], img: 'Single_Leg_Glute_Bridge',
    tips: ['Una pierna estirada en el aire', 'Cadera nivelada, sin rotar', 'Pausa arriba 1 segundo'] },
  { id: 'cable-kick', name: 'Patada de glúteo en polea', muscle: 'glutes', sets: 3, reps: '12-15', img: 'One-Legged_Cable_Kickback',
    tips: ['Agarrate firme de la máquina', 'Patada hacia atrás sin arquear la espalda', 'Apretá el glúteo arriba'] },
  { id: 'abduction', name: 'Abducción en máquina', muscle: 'glutes', sets: 3, reps: '15-20', img: 'Thigh_Abductor',
    tips: ['Espalda apoyada', 'Abrí controlado y pausá afuera', 'Inclinarte un poco adelante enfoca glúteo'] },

  // ── Gemelos ──
  { id: 'standing-calf', name: 'Elevación de talones de pie', muscle: 'calves', sets: 4, reps: '10-15', img: 'Standing_Calf_Raises',
    tips: ['Rango completo: bien abajo y bien arriba', 'Pausa arriba 1-2 segundos', 'Rodillas rectas'] },
  { id: 'seated-calf', name: 'Elevación de talones sentado', muscle: 'calves', sets: 4, reps: '12-15', img: 'Seated_Calf_Raise',
    tips: ['Trabaja el sóleo (parte baja)', 'Bajada lenta y estiramiento abajo', 'Sin rebotar'] },
  { id: 'press-calf', name: 'Gemelos en prensa', muscle: 'calves', sets: 4, reps: '12-15', img: 'Calf_Press_On_The_Leg_Press_Machine',
    tips: ['Solo la punta del pie en la plataforma', 'Rodillas casi rectas', 'Empujá con los dedos gordos'] },

  // ── Core ──
  { id: 'plank', name: 'Plancha (segundos)', muscle: 'core', sets: 3, reps: '30-60', tags: ['cali'], img: 'Plank',
    tips: ['Codos bajo los hombros', 'Glúteos y abdomen apretados, cuerpo recto', 'No dejes caer ni levantar la cadera'] },
  { id: 'side-plank', name: 'Plancha lateral (segundos)', muscle: 'core', sets: 3, reps: '30-45', tags: ['cali'], img: 'Side_Bridge',
    tips: ['Codo bajo el hombro', 'Cadera alta, cuerpo en línea', 'Hacé los dos lados'] },
  { id: 'hollow', name: 'Hollow hold (segundos)', muscle: 'core', sets: 3, reps: '20-40', tags: ['cali'],
    tips: ['Boca arriba, espalda baja pegada al piso', 'Piernas y hombros despegados, brazos atrás', 'Si cuesta, flexioná las rodillas'] },
  { id: 'l-sit', name: 'L-sit (segundos)', muscle: 'core', sets: 3, reps: '10-30', tags: ['cali'],
    tips: ['En paralelas o el piso, brazos rectos', 'Piernas rectas a 90° del torso', 'Empezá con rodillas flexionadas (tuck)'] },
  { id: 'cable-crunch', name: 'Crunch en polea', muscle: 'core', sets: 3, reps: '12-15', img: 'Cable_Crunch',
    tips: ['De rodillas, cuerda a los costados de la cabeza', 'Enrollá la columna llevando codos a muslos', 'La cadera no se mueve'] },
  { id: 'hanging-raise', name: 'Elevación de piernas colgado', muscle: 'core', sets: 3, reps: '10-15', tags: ['cali'], img: 'Hanging_Leg_Raise',
    tips: ['Sin balanceo', 'Subí las piernas enrollando la pelvis', 'Rodillas flexionadas para empezar'] },
  { id: 'knee-raise-pb', name: 'Elevación de rodillas en paralelas', muscle: 'core', sets: 3, reps: '10-15', tags: ['cali'], img: 'Knee_Hip_Raise_On_Parallel_Bars',
    tips: ['Brazos firmes, hombros abajo', 'Rodillas al pecho', 'Bajá controlado'] },
  { id: 'ab-wheel', name: 'Rueda abdominal', muscle: 'core', sets: 3, reps: '8-12', img: 'Ab_Roller',
    tips: ['Empezá de rodillas', 'Abdomen apretado, sin hundir la espalda baja', 'Avanzá solo hasta donde controles'] },
  { id: 'russian-twist', name: 'Russian twist', muscle: 'core', sets: 3, reps: '20', img: 'Russian_Twist',
    tips: ['Torso inclinado atrás, espalda recta', 'Girá desde el torso, no solo los brazos', 'Pies apoyados para empezar'] },

  // ── Pliometría · piernas ──
  { id: 'box-jump', name: 'Saltos al cajón', muscle: 'plyoLower', compound: true, sets: 4, reps: '5', img: 'Front_Box_Jump',
    tips: ['Impulso con brazos y caé suave en el cajón', 'Rodillas alineadas con los pies al aterrizar', 'Bajá caminando, no saltando'] },
  { id: 'jump-squat', name: 'Sentadilla con salto', muscle: 'plyoLower', compound: true, sets: 4, reps: '8', img: 'Freehand_Jump_Squat',
    tips: ['Bajá a media sentadilla y saltá explosivo', 'Aterrizá suave en la punta y amortiguá', 'Encadená sin pausas largas'] },
  { id: 'broad-jump', name: 'Salto horizontal', muscle: 'plyoLower', compound: true, sets: 4, reps: '5', img: 'Standing_Long_Jump',
    tips: ['Balanceá los brazos y saltá lo más lejos posible', 'Aterrizá con los dos pies y rodillas flexionadas', 'Resetea entre cada salto'] },
  { id: 'split-jump', name: 'Zancadas con salto', muscle: 'plyoLower', sets: 3, reps: '6 por pierna', img: 'Split_Jump',
    tips: ['Desde zancada, saltá y cambiá de pierna en el aire', 'Torso derecho', 'Aterrizaje suave y controlado'] },
  { id: 'tuck-jump', name: 'Saltos con rodillas al pecho', muscle: 'plyoLower', sets: 3, reps: '8', img: 'Knee_Tuck_Jump',
    tips: ['Llevá las rodillas al pecho arriba', 'Brazos ayudan al impulso', 'Mínimo tiempo en el piso entre saltos'] },
  { id: 'lateral-bound', name: 'Saltos laterales (patinador)', muscle: 'plyoLower', sets: 3, reps: '6 por lado', img: 'Lateral_Bound',
    tips: ['Saltá de costado a una pierna', 'Aterrizá estable 1 segundo antes del siguiente', 'Rodilla no se va hacia adentro'] },
  { id: 'hurdle-hops', name: 'Saltos de vallas', muscle: 'plyoLower', sets: 3, reps: '6', img: 'Hurdle_Hops',
    tips: ['Vallas o conos bajos en fila', 'Saltos rápidos con los dos pies', 'Rodillas arriba, contacto corto'] },
  { id: 'sl-hop', name: 'Saltos laterales a una pierna', muscle: 'plyoLower', sets: 3, reps: '8 por pierna', img: 'Single-Leg_Lateral_Hop',
    tips: ['Saltá de lado a lado sobre una línea', 'Mantené el equilibrio y la rodilla alineada', 'Empezá con saltos cortos'] },
  { id: 'depth-jump', name: 'Salto en profundidad', muscle: 'plyoLower', sets: 3, reps: '5', img: 'Linear_Depth_Jump',
    tips: ['Avanzado: dejate caer de un cajón bajo (30-40 cm)', 'Al tocar el piso, saltá inmediatamente', 'Prioridad: aterrizajes limpios'] },
  { id: 'star-jump', name: 'Saltos de estrella', muscle: 'plyoLower', sets: 3, reps: '10', img: 'Star_Jump',
    tips: ['Desde sentadilla, saltá abriendo brazos y piernas', 'Cerrá antes de aterrizar', 'Aterrizá suave'] },
  { id: 'burpee', name: 'Burpees', muscle: 'plyoLower', sets: 3, reps: '10',
    tips: ['Manos al piso, pies atrás, flexión', 'Pies a las manos y salto con brazos arriba', 'Ritmo constante, espalda sin hundirse'] },

  // ── Pliometría · torso ──
  { id: 'plyo-pushup', name: 'Flexiones pliométricas', muscle: 'plyoUpper', compound: true, sets: 4, reps: '5-8', img: 'Plyo_Push-up',
    tips: ['Empujá explosivo hasta despegar las manos', 'Aterrizá con codos flexionados', 'Cuerpo recto todo el tiempo'] },
  { id: 'med-slam', name: 'Lanzamiento de balón al suelo', muscle: 'plyoUpper', compound: true, sets: 3, reps: '8', img: 'Overhead_Slam',
    tips: ['Balón arriba de la cabeza, en puntas de pie', 'Lanzalo al piso con todo el cuerpo', 'Usá un balón que no rebote'] },
  { id: 'med-chest', name: 'Pase de pecho con balón', muscle: 'plyoUpper', sets: 3, reps: '8', img: 'Medicine_Ball_Chest_Pass',
    tips: ['Contra una pared o compañero', 'Empujá explosivo desde el pecho', 'Recibí y repetí sin pausa'] },
  { id: 'mountain', name: 'Escaladores', muscle: 'plyoUpper', sets: 3, reps: '20-30', img: 'Mountain_Climbers',
    tips: ['Posición de flexión, manos bajo los hombros', 'Rodillas al pecho alternando rápido', 'Cadera baja y estable'] },
];

// Cada rutina define cuántos ejercicios elegir de cada grupo muscular.
// Formato del slot: [músculo, cantidad, tag opcional]
const ROUTINES = {
  push: { name: 'Push', desc: 'Pecho, hombros y tríceps', slots: [['chest', 2], ['shoulders', 2], ['triceps', 2]] },
  pull: { name: 'Pull', desc: 'Espalda y bíceps', slots: [['back', 3], ['rearDelts', 1], ['biceps', 2]] },
  legs: { name: 'Piernas', desc: 'Cuádriceps, isquios, glúteos', slots: [['quads', 2], ['hamstrings', 2], ['glutes', 1], ['calves', 1]] },
  upper: { name: 'Torso', desc: 'Todo el tren superior', slots: [['chest', 2], ['back', 2], ['shoulders', 1], ['biceps', 1], ['triceps', 1]] },
  full: { name: 'Full Body', desc: 'Cuerpo completo', slots: [['quads', 1], ['chest', 1], ['back', 1], ['hamstrings', 1], ['shoulders', 1], ['core', 1]] },
  arms: { name: 'Brazos', desc: 'Bíceps, tríceps y hombro', slots: [['biceps', 3], ['triceps', 3], ['shoulders', 1]] },
  cali: { name: 'Calistenia', desc: 'Solo peso corporal', slots: [['back', 2, 'cali'], ['chest', 1, 'cali'], ['shoulders', 1, 'cali'], ['triceps', 1, 'cali'], ['quads', 1, 'cali'], ['core', 2, 'cali']] },
  plyo: { name: 'Pliometría', desc: 'Saltos y potencia explosiva', slots: [['plyoLower', 4], ['plyoUpper', 2]] },
  core: { name: 'Core', desc: 'Abdomen y zona media', slots: [['core', 4]] },
  free: { name: 'Libre', desc: 'Elegís vos los ejercicios', slots: [] },
  combo: { name: 'Combinación', desc: 'Mezclá 2 o 3 tipos en una sola rutina', slots: [], combo: true },
};

// Límites de la Combinación: así queda una sesión de ~50-60 min y no la suma de rutinas completas.
const COMBO = {
  maxTypes: 3,
  exercises: { 2: 7, 3: 7 },  // ejercicios totales según cuántos tipos elegís
  sets: { 2: 22, 3: 22 },     // series totales máximas
};

// ---------- Calentamiento ----------
// Cada paso: name, y reps (texto) o dur (segundos, con cronómetro). tip opcional.
const WARMUP_STEPS = {
  cardio: { name: 'Cardio suave (bici, cinta, elíptica o soga)', dur: 180, tip: 'Ritmo cómodo: podés hablar sin ahogarte' },
  'arm-circles': { name: 'Círculos de brazos', reps: '10 adelante + 10 atrás' },
  'band-dislocates': { name: 'Pasadas de banda o palo por encima de la cabeza', reps: '10', tip: 'Brazos rectos, agarre ancho' },
  'band-er': { name: 'Rotación externa con banda', reps: '12 por brazo', tip: 'Codo pegado al cuerpo' },
  'scap-pushup': { name: 'Flexiones escapulares', reps: '10', tip: 'Brazos rectos: solo se mueven las escápulas' },
  'band-pull-apart': { name: 'Aperturas con banda (pull-apart)', reps: '15', tip: 'Juntá las escápulas al abrir' },
  'scap-pull': { name: 'Dominadas escapulares', reps: '8', tip: 'Colgado, bajá los hombros sin doblar los codos' },
  'pushup-easy': { name: 'Flexiones suaves', reps: '8', tip: 'Ritmo lento, sin llegar al fallo' },
  'thoracic-rot': { name: 'Rotaciones torácicas en cuadrupedia', reps: '8 por lado' },
  'cat-cow': { name: 'Gato-camello', reps: '8', tip: 'Movimiento lento vértebra por vértebra' },
  wrist: { name: 'Movilidad de muñecas', dur: 45, tip: 'Círculos y apoyos suaves en el piso' },
  'leg-swings': { name: 'Balanceos de pierna (adelante y lateral)', reps: '10 por pierna' },
  'hip-circles': { name: 'Círculos de cadera', reps: '10 por lado' },
  ankle: { name: 'Movilidad de tobillo contra la pared', reps: '10 por pie', tip: 'Rodilla hacia la pared sin levantar el talón' },
  'glute-bridge': { name: 'Puente de glúteo', reps: '12', tip: 'Apretá arriba 1 segundo' },
  'bw-squat': { name: 'Sentadillas sin peso', reps: '12', tip: 'Profundas y lentas' },
  'worlds-greatest': { name: 'Estiramiento "el mejor del mundo"', reps: '5 por lado', tip: 'Zancada, codo al piso y rotación hacia arriba' },
  'lunge-walk': { name: 'Zancadas caminando', reps: '6 por pierna' },
  'dead-bug': { name: 'Dead bug', reps: '8 por lado', tip: 'Espalda baja pegada al piso' },
  'bird-dog': { name: 'Bird dog', reps: '8 por lado' },
  skipping: { name: 'Skipping (rodillas arriba)', dur: 30 },
  'butt-kicks': { name: 'Talones a la cola', dur: 30 },
  'jumping-jacks': { name: 'Saltos de tijera', reps: '20' },
  pogo: { name: 'Saltitos en el lugar (pogo)', reps: '20', tip: 'Rodillas casi rectas, rebote con los tobillos' },
  'easy-jumps': { name: 'Saltos submáximos', reps: '3 al 50% + 3 al 75%', tip: 'Prepará el sistema nervioso antes de los saltos fuertes' },
};

// Movilidad y activación específica de cada tipo (el cardio y las series de aproximación se agregan solos)
const WARMUP_PLANS = {
  push: ['arm-circles', 'band-dislocates', 'band-er', 'scap-pushup', 'pushup-easy'],
  pull: ['arm-circles', 'band-dislocates', 'thoracic-rot', 'band-pull-apart', 'scap-pull'],
  legs: ['leg-swings', 'hip-circles', 'ankle', 'glute-bridge', 'bw-squat'],
  upper: ['arm-circles', 'band-dislocates', 'band-pull-apart', 'scap-pushup', 'scap-pull'],
  full: ['worlds-greatest', 'arm-circles', 'leg-swings', 'band-pull-apart', 'bw-squat'],
  arms: ['arm-circles', 'wrist', 'band-er', 'pushup-easy'],
  cali: ['wrist', 'arm-circles', 'scap-pushup', 'scap-pull', 'bw-squat'],
  plyo: ['leg-swings', 'ankle', 'skipping', 'butt-kicks', 'pogo', 'easy-jumps'],
  core: ['cat-cow', 'bird-dog', 'dead-bug'],
  free: ['arm-circles', 'leg-swings', 'worlds-greatest'],
};
const WARMUP_MAX_STEPS = 6; // sin contar cardio ni series de aproximación

const SPORTS = ['Fútbol', 'Correr', 'Caminata', 'Ciclismo', 'Natación', 'Pádel', 'Tenis', 'Básquet', 'Vóley', 'Yoga / Movilidad', 'Artes marciales', 'Otro'];
