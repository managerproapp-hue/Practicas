export interface Interview {
  id: string;
  date: string;
  attendees: string;
  notes: string;
}

export interface Annotation {
  id: string;
  date: string;
  note: string;
  type: 'positive' | 'negative' | 'neutral';
  subtype?: string;
}

export interface Student {
  nre: string;
  expediente: string;
  apellido1: string;
  apellido2: string;
  nombre: string;
  grupo: string;
  subgrupo: string;
  fechaNacimiento: string;
  telefono: string;
  telefono2: string;
  emailPersonal: string;
  emailOficial: string;
  photoUrl?: string;
  entrevistas?: Interview[];
  anotaciones?: Annotation[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  allergens: string[];
}


export type NavItemType = 
  | 'Dashboard'
  | 'Alumnos' 
  | 'Gestión Práctica' 
  | 'Gestión de Notas'
  | 'Registro de Salidas'
  | 'Exámenes Prácticos'
  | 'Gestión Académica'
  | 'Cocina'
  | 'Gestión de la App';

export type CocinaSubView = 'Productos' | 'Pedidos' | 'Mi Recetario' | 'Creación de Menús';

export interface TeacherData {
  name: string;
  email: string;
  logo?: string | null;
}

export interface InstituteData {
  name: string;
  address: string;
  cif: string;
  logo?: string | null;
}

// --- MI RECETARIO TYPES ---

export interface RecipeIngredient {
  productId: string;
  quantity: number;
  unit: string;
}

export interface RecipeStep {
  id: string;
  description: string;
}

export interface Elaboration {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  description: string;
  serviceNotes: string; // "Anotaciones extras"
  servings: number;
  elaborations: Elaboration[];
  visibility: 'private' | 'public';
  authorId: string; // Placeholder for future multi-user system
  createdAt: string;
  updatedAt?: string;
}

// --- GESTION PRÁCTICA TYPES ---
export interface Service {
  id: string;
  name: string;
  date: string;
  trimestre: number;
  groupAssignments: {
    comedor: string[];
    takeaway: string[];
  };
  finalized?: boolean;
}

export type StudentGroupAssignments = Record<string, string>; // { [studentNre]: groupName }

export type PlanningAssignments = Record<string, Record<string, string>>; // { [serviceId]: { [studentNre]: role } }

export interface Role {
    name: string;
    type: 'leader' | 'secondary';
}


// --- CREACIÓN DE MENÚS TYPES ---

export interface MenuApartado {
  [apartadoName: string]: string[]; // Array of recipe IDs
}

export interface Menu {
  pax: number;
  comedor: MenuApartado;
  takeaway: MenuApartado;
}

export interface MenusState {
  [serviceId: string]: Menu;
}

// --- FICHA DE SERVICIO MENU TYPES ---
export interface ServiceDish {
  id: string;
  name: string;
  assignedGroup: string;
}

export interface ServiceMenu {
  comedor: ServiceDish[];
  takeaway: ServiceDish[];
  familia: ServiceDish[];
}


// --- GESTIÓN DE NOTAS TYPES ---
export interface EvaluationItemScore {
  itemId: string;
  score: number;
}

export interface GroupEvaluation {
  serviceId: string;
  groupId: string; // The name of the practica group, e.g., "Grupo 1"
  scores: EvaluationItemScore[];
  observation: string;
}

export interface IndividualEvaluation {
  serviceId: string;
  studentNre: string;
  attendance: 'present' | 'absent';
  scores: EvaluationItemScore[];
  observation?: string;
}

export interface EvaluationsState {
  group: GroupEvaluation[];
  individual: IndividualEvaluation[];
}

// --- EXÁMENES PRÁCTICOS TYPES ---
export type ExamType = 'T1' | 'T2' | 'REC';

export interface PracticalExamScore {
  criterionId: string;
  score: number; // e.g., 10, 8, 5, 2
  notes: string;
}

export interface StudentPracticalExam {
  studentNre: string;
  examType: ExamType;
  scores: PracticalExamScore[];
  generalObservations?: string;
  startTime?: string;
  endTime?: string;
  finalScore?: number;
}

// --- GESTIÓN ACADÉMICA TYPES ---
export interface TheoreticalExamGrades {
  examen1?: number;
  examen2?: number;
  examen3?: number;
  examen4?: number;
  recuperacion?: number;
}

// --- NOTAS DEL CURSO TYPES ---
export interface CourseModuleGrades {
  t1?: number;
  t2?: number;
  t3?: number;
  rec?: number;
}

export type CourseGrades = {
  [moduleKey: string]: CourseModuleGrades;
};