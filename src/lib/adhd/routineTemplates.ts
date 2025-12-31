import { NewRoutine } from "@/store/adhd/routineStore";

export interface RoutineTemplate extends NewRoutine {
  id: string;
  templateName: string;
  templateDescription: string;
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  // Morning Routines
  {
    id: "morning-energizing",
    templateName: "Rutina Mañana Energizante",
    templateDescription: "Comienza el día con energía y enfoque",
    name: "Mañana Energizante",
    description: "Rutina para despertar con energía y prepararte para el día",
    icon: "☀️",
    category: "mañana",
    startTime: "07:00",
    isActive: true,
    order: 0,
    tasks: [
      {
        name: "Tomar agua",
        icon: "💧",
        duration: 2,
        order: 0,
        autoContinue: true,
        notes: "Un vaso grande de agua para rehidratarte después de dormir",
      },
      {
        name: "Estiramientos",
        icon: "🧘",
        duration: 5,
        order: 1,
        autoContinue: true,
        notes: "Estiramientos suaves para activar el cuerpo",
      },
      {
        name: "Ducha",
        icon: "🚿",
        duration: 10,
        order: 2,
        autoContinue: true,
        notes: "Ducha revitalizante para despertar completamente",
      },
      {
        name: "Skincare",
        icon: "✨",
        duration: 5,
        order: 3,
        autoContinue: true,
        notes: "Rutina de cuidado facial matutino",
      },
      {
        name: "Vestirse",
        icon: "👔",
        duration: 10,
        order: 4,
        autoContinue: true,
        notes: "Elegir ropa cómoda y apropiada para el día",
      },
      {
        name: "Desayuno saludable",
        icon: "🥗",
        duration: 15,
        order: 5,
        autoContinue: true,
        notes: "Desayuno nutritivo con proteínas y frutas",
      },
      {
        name: "Revisar calendario",
        icon: "📅",
        duration: 5,
        order: 6,
        autoContinue: true,
        notes: "Revisar tareas y compromisos del día",
      },
      {
        name: "Meditación",
        icon: "🧘‍♀️",
        duration: 10,
        order: 7,
        autoContinue: false,
        notes: "Meditación o respiración consciente para centrar la mente",
      },
    ],
  },

  {
    id: "morning-quick",
    templateName: "Rutina Mañana Rápida",
    templateDescription: "Para días con poco tiempo",
    name: "Mañana Express",
    description: "Rutina esencial para mañanas con prisa",
    icon: "⚡",
    category: "mañana",
    startTime: "07:30",
    isActive: true,
    order: 0,
    tasks: [
      {
        name: "Tomar agua",
        icon: "💧",
        duration: 1,
        order: 0,
        autoContinue: true,
      },
      {
        name: "Ducha rápida",
        icon: "🚿",
        duration: 5,
        order: 1,
        autoContinue: true,
      },
      {
        name: "Vestirse",
        icon: "👔",
        duration: 5,
        order: 2,
        autoContinue: true,
      },
      {
        name: "Desayuno ligero",
        icon: "🍎",
        duration: 5,
        order: 3,
        autoContinue: false,
      },
    ],
  },

  // Night Routines
  {
    id: "night-relaxing",
    templateName: "Rutina Noche Relajante",
    templateDescription: "Prepárate para un sueño reparador",
    name: "Noche de Descanso",
    description: "Rutina para desconectar y prepararte para dormir bien",
    icon: "🌙",
    category: "noche",
    startTime: "21:00",
    isActive: true,
    order: 0,
    tasks: [
      {
        name: "Apagar pantallas",
        icon: "📱",
        duration: 1,
        order: 0,
        autoContinue: true,
        notes: "Dejar el teléfono y computadora fuera del dormitorio",
      },
      {
        name: "Preparar ropa para mañana",
        icon: "👕",
        duration: 5,
        order: 1,
        autoContinue: true,
        notes: "Dejar la ropa lista para evitar decisiones por la mañana",
      },
      {
        name: "Ducha caliente",
        icon: "🛁",
        duration: 15,
        order: 2,
        autoContinue: true,
        notes: "Baño relajante con agua tibia",
      },
      {
        name: "Skincare nocturno",
        icon: "✨",
        duration: 5,
        order: 3,
        autoContinue: true,
        notes: "Rutina de cuidado facial antes de dormir",
      },
      {
        name: "Lectura",
        icon: "📖",
        duration: 20,
        order: 4,
        autoContinue: true,
        notes: "Leer algo ligero y relajante",
      },
      {
        name: "Meditación guiada",
        icon: "🧘",
        duration: 10,
        order: 5,
        autoContinue: true,
        notes: "Meditación o ejercicios de respiración para relajar",
      },
      {
        name: "Estiramientos suaves",
        icon: "🤸",
        duration: 5,
        order: 6,
        autoContinue: false,
        notes: "Estiramientos ligeros para relajar los músculos",
      },
    ],
  },

  // Exercise Routines
  {
    id: "exercise-cardio",
    templateName: "Rutina Cardio",
    templateDescription: "Ejercicio cardiovascular completo",
    name: "Sesión Cardio",
    description: "Rutina de ejercicio cardiovascular",
    icon: "🏃",
    category: "ejercicio",
    startTime: "06:00",
    isActive: true,
    order: 0,
    tasks: [
      {
        name: "Cambiar a ropa deportiva",
        icon: "👟",
        duration: 3,
        order: 0,
        autoContinue: true,
      },
      {
        name: "Calentamiento",
        icon: "🔥",
        duration: 5,
        order: 1,
        autoContinue: true,
        notes: "Estiramientos dinámicos y movilidad articular",
      },
      {
        name: "Cardio principal",
        icon: "🏃‍♂️",
        duration: 30,
        order: 2,
        autoContinue: true,
        notes: "Correr, bicicleta, o elíptica",
      },
      {
        name: "Enfriamiento",
        icon: "🧊",
        duration: 5,
        order: 3,
        autoContinue: true,
        notes: "Caminar lento y respiración profunda",
      },
      {
        name: "Estiramientos",
        icon: "🧘",
        duration: 10,
        order: 4,
        autoContinue: true,
        notes: "Estiramientos estáticos para prevenir lesiones",
      },
      {
        name: "Hidratación",
        icon: "💧",
        duration: 2,
        order: 5,
        autoContinue: false,
        notes: "Beber agua para rehidratarte",
      },
    ],
  },

  {
    id: "exercise-strength",
    templateName: "Rutina Fuerza",
    templateDescription: "Entrenamiento de fuerza y resistencia",
    name: "Sesión de Fuerza",
    description: "Rutina de entrenamiento con pesas",
    icon: "💪",
    category: "ejercicio",
    startTime: "18:00",
    isActive: true,
    order: 0,
    tasks: [
      {
        name: "Cambiar a ropa deportiva",
        icon: "👟",
        duration: 3,
        order: 0,
        autoContinue: true,
      },
      {
        name: "Calentamiento dinámico",
        icon: "🔥",
        duration: 10,
        order: 1,
        autoContinue: true,
      },
      {
        name: "Ejercicios de fuerza",
        icon: "🏋️",
        duration: 40,
        order: 2,
        autoContinue: true,
        notes: "Series de ejercicios con pesas o peso corporal",
      },
      {
        name: "Core y abdomen",
        icon: "🔲",
        duration: 10,
        order: 3,
        autoContinue: true,
      },
      {
        name: "Estiramientos",
        icon: "🧘",
        duration: 10,
        order: 4,
        autoContinue: true,
      },
      {
        name: "Proteína post-entrenamiento",
        icon: "🥛",
        duration: 2,
        order: 5,
        autoContinue: false,
      },
    ],
  },

  // Study Routines
  {
    id: "study-deep-focus",
    templateName: "Estudio Concentrado",
    templateDescription: "Sesión de estudio profundo con Pomodoro",
    name: "Sesión de Estudio",
    description: "Rutina para estudio intensivo con descansos",
    icon: "📚",
    category: "estudio",
    startTime: "14:00",
    isActive: true,
    order: 0,
    tasks: [
      {
        name: "Preparar espacio",
        icon: "🧹",
        duration: 5,
        order: 0,
        autoContinue: true,
        notes: "Limpiar escritorio y reunir materiales",
      },
      {
        name: "Revisar objetivos",
        icon: "🎯",
        duration: 3,
        order: 1,
        autoContinue: true,
        notes: "Definir qué vas a estudiar en esta sesión",
      },
      {
        name: "Pomodoro 1",
        icon: "🍅",
        duration: 25,
        order: 2,
        autoContinue: true,
        notes: "25 minutos de estudio concentrado",
      },
      {
        name: "Descanso corto",
        icon: "☕",
        duration: 5,
        order: 3,
        autoContinue: true,
        notes: "Levantarse, estirar, tomar agua",
      },
      {
        name: "Pomodoro 2",
        icon: "🍅",
        duration: 25,
        order: 4,
        autoContinue: true,
      },
      {
        name: "Descanso corto",
        icon: "☕",
        duration: 5,
        order: 5,
        autoContinue: true,
      },
      {
        name: "Pomodoro 3",
        icon: "🍅",
        duration: 25,
        order: 6,
        autoContinue: true,
      },
      {
        name: "Descanso largo",
        icon: "🌳",
        duration: 15,
        order: 7,
        autoContinue: true,
        notes: "Caminar, hacer ejercicio ligero",
      },
      {
        name: "Revisar aprendizajes",
        icon: "📝",
        duration: 10,
        order: 8,
        autoContinue: false,
        notes: "Resumir lo aprendido y planear siguiente sesión",
      },
    ],
  },

  // Relaxation Routines
  {
    id: "relax-mindfulness",
    templateName: "Mindfulness y Relajación",
    templateDescription: "Reduce el estrés con meditación y respiración",
    name: "Momento de Calma",
    description: "Rutina de relajación y mindfulness",
    icon: "🕊️",
    category: "relajación",
    startTime: "17:00",
    isActive: true,
    order: 0,
    tasks: [
      {
        name: "Encontrar lugar tranquilo",
        icon: "🏞️",
        duration: 2,
        order: 0,
        autoContinue: true,
        notes: "Buscar un espacio cómodo y sin distracciones",
      },
      {
        name: "Respiración profunda",
        icon: "💨",
        duration: 5,
        order: 1,
        autoContinue: true,
        notes: "Ejercicios de respiración 4-7-8",
      },
      {
        name: "Body scan meditation",
        icon: "🧘",
        duration: 10,
        order: 2,
        autoContinue: true,
        notes: "Escaneo corporal de pies a cabeza",
      },
      {
        name: "Meditación guiada",
        icon: "🎧",
        duration: 15,
        order: 3,
        autoContinue: true,
        notes: "Audio de meditación o música relajante",
      },
      {
        name: "Estiramientos suaves",
        icon: "🤸",
        duration: 10,
        order: 4,
        autoContinue: true,
        notes: "Yoga suave o tai chi",
      },
      {
        name: "Gratitud",
        icon: "🙏",
        duration: 3,
        order: 5,
        autoContinue: false,
        notes: "Escribir 3 cosas por las que estás agradecido",
      },
    ],
  },

  {
    id: "relax-creative",
    templateName: "Descanso Creativo",
    templateDescription: "Relájate con actividades creativas",
    name: "Tiempo Creativo",
    description: "Rutina de relajación a través de la creatividad",
    icon: "🎨",
    category: "relajación",
    startTime: "16:00",
    isActive: true,
    order: 0,
    tasks: [
      {
        name: "Preparar materiales",
        icon: "🖌️",
        duration: 5,
        order: 0,
        autoContinue: true,
        notes: "Reunir materiales para actividad creativa",
      },
      {
        name: "Música relajante",
        icon: "🎵",
        duration: 2,
        order: 1,
        autoContinue: true,
        notes: "Poner música suave de fondo",
      },
      {
        name: "Actividad creativa",
        icon: "✨",
        duration: 30,
        order: 2,
        autoContinue: true,
        notes: "Dibujar, pintar, escribir, o cualquier hobby creativo",
      },
      {
        name: "Reflexión",
        icon: "💭",
        duration: 5,
        order: 3,
        autoContinue: false,
        notes: "Reflexionar sobre el proceso creativo",
      },
    ],
  },
];

/**
 * Get all routine templates
 */
export function getAllTemplates(): RoutineTemplate[] {
  return ROUTINE_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: string
): RoutineTemplate[] {
  return ROUTINE_TEMPLATES.filter((template) => template.category === category);
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(id: string): RoutineTemplate | undefined {
  return ROUTINE_TEMPLATES.find((template) => template.id === id);
}

/**
 * Get template categories with counts
 */
export function getTemplateCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  ROUTINE_TEMPLATES.forEach((template) => {
    const cat = template.category || "other";
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return counts;
}
