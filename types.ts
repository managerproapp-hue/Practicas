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

export type NavItemType = 
  | 'Dashboard'
  | 'Alumnos' 
  | 'Gestión Práctica' 
  | 'Gestión de Notas'
  | 'Registro de Salidas'
  | 'Exámenes Prácticos'
  | 'Gestión Académica'
  | 'Gestión de la App';

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
