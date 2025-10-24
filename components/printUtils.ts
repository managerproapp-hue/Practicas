import { TeacherData, InstituteData, Service, Student, PlanningAssignments, StudentGroupAssignments, Role } from './types';

// Declare the libraries loaded from CDN
declare var jspdf: any;
declare var XLSX: any;

// Augment the jsPDF interface to include the autoTable method from the plugin
declare global {
  namespace jspdf {
    interface jsPDF {
      autoTable: (options: any) => jsPDF;
      lastAutoTable: { finalY: number };
      putTotalPages: (pageExpression: string) => jsPDF;
    }
  }
}

// Helper to fetch data safely from localStorage
const getStoredData = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
};

interface PdfOptions {
  orientation?: 'portrait' | 'landscape';
}

interface PdfTableConfig {
    head?: any[][];
    body: any[][];
    options?: any;
    columnStyles?: { [key: string]: any };
}

// Helper to get image dimensions from base64 string to preserve aspect ratio
const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = (err) => {
            console.error("Failed to load image from base64 for dimension calculation.");
            reject(err);
        };
        img.src = base64;
    });
};

/**
 * Generates a PDF with headers, footers, and multiple tables using jspdf-autotable.
 * @param title The main title of the document.
 * @param fileName The name for the downloaded file.
 * @param tables An array of table configurations to be rendered sequentially.
 * @param options PDF orientation options.
 */
export const downloadPdfWithTables = async (title: string, fileName: string, tables: PdfTableConfig[], options: PdfOptions = {}) => {
    if (typeof jspdf === 'undefined' || typeof (new jspdf.jsPDF()).autoTable === 'undefined') {
        alert("La librería para generar PDF (jsPDF/autoTable) no está disponible. Por favor, recargue la página.");
        return;
    }

    const { jsPDF } = jspdf;
    const { orientation = 'portrait' } = options;
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    
    const headerHeight = 25;
    const footerHeight = 15;

    // --- Prepare Header/Footer Data ---
    const teacherData = getStoredData<TeacherData>('teacher-app-data', { name: 'Profesor', email: '' });
    const instituteData = getStoredData<InstituteData>('institute-app-data', { name: 'Instituto', address: '', cif: '' });

    const logoHeight = 12;
    let instituteLogo, teacherLogo;
    if (instituteData.logo) {
        try {
            const dims = await getImageDimensions(instituteData.logo);
            instituteLogo = { data: instituteData.logo, width: (dims.width / dims.height) * logoHeight, height: logoHeight };
        } catch(e) { console.error("Error processing institute logo", e); }
    }
    if (teacherData.logo) {
        try {
            const dims = await getImageDimensions(teacherData.logo);
            teacherLogo = { data: teacherData.logo, width: (dims.width / dims.height) * logoHeight, height: logoHeight };
        } catch(e) { console.error("Error processing teacher logo", e); }
    }

    // --- Draw Tables ---
    let startY: number | undefined = headerHeight;
    
    tables.forEach((tableConfig) => {
        doc.autoTable({
            head: tableConfig.head,
            body: tableConfig.body,
            startY: startY,
            margin: { top: headerHeight, bottom: footerHeight },
            theme: 'grid',
            headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold' },
            columnStyles: tableConfig.columnStyles || {},
            ...tableConfig.options,
            didDrawPage: (data: any) => {
                // --- HEADER ---
                const headerStartY = 8;
                if (instituteLogo) {
                    doc.addImage(instituteLogo.data, 'PNG', data.settings.margin.left, headerStartY, instituteLogo.width, instituteLogo.height);
                }
                if (teacherLogo) {
                    doc.addImage(teacherLogo.data, 'PNG', doc.internal.pageSize.getWidth() - data.settings.margin.right - teacherLogo.width, headerStartY, teacherLogo.width, teacherLogo.height);
                }

                doc.setFontSize(8);
                doc.setTextColor(80, 80, 80);
                doc.text(instituteData.name, data.settings.margin.left, headerStartY + logoHeight + 2);
                doc.text(teacherData.name, doc.internal.pageSize.getWidth() - data.settings.margin.right, headerStartY + logoHeight + 2, { align: 'right' });
                
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(20, 20, 20);
                doc.text(title, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });

                doc.setDrawColor(229, 231, 235);
                doc.line(data.settings.margin.left, headerHeight - 5, doc.internal.pageSize.getWidth() - data.settings.margin.right, headerHeight - 5);

                // --- FOOTER ---
                const footerY = doc.internal.pageSize.getHeight() - 8;
                doc.setDrawColor(229, 231, 235);
                doc.line(data.settings.margin.left, doc.internal.pageSize.getHeight() - footerHeight + 2, doc.internal.pageSize.getWidth() - data.settings.margin.right, doc.internal.pageSize.getHeight() - footerHeight + 2);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(120, 120, 120);

                const pageNumText = `Página ${data.pageNumber}`;
                doc.text(`${instituteData.name} - ${teacherData.name}`, data.settings.margin.left, footerY);
                doc.text(pageNumText, doc.internal.pageSize.getWidth() / 2, footerY, { align: 'center' });
                doc.text(new Date().toLocaleDateString(), doc.internal.pageSize.getWidth() - data.settings.margin.right, footerY, { align: 'right' });
            },
        });
        startY = doc.lastAutoTable.finalY + 8; // Space between tables
    });
    
    doc.save(`${fileName}.pdf`);
};

export const downloadPlanningPdf = async (
    service: Service,
    allStudents: Student[],
    allAssignments: PlanningAssignments,
    studentGroupAssignments: StudentGroupAssignments,
    leaderRoles: Role[]
) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const assignmentsForService = allAssignments[service.id] || {};
    const leaderRoleNames = new Set(leaderRoles.map(r => r.name));
    
    const teacherData = getStoredData<TeacherData>('teacher-app-data', { name: 'Profesor', email: '' });
    const instituteData = getStoredData<InstituteData>('institute-app-data', { name: 'IES La Flota', address: '', cif: '' });
    let instituteLogo: any, teacherLogo: any;
    const logoHeight = 12;
    if (instituteData.logo) {
         try {
            const dims = await getImageDimensions(instituteData.logo);
            instituteLogo = { data: instituteData.logo, width: (dims.width / dims.height) * logoHeight, height: logoHeight };
        } catch(e) { console.error("Error processing institute logo", e); }
    }
    if (teacherData.logo) {
        try {
            const dims = await getImageDimensions(teacherData.logo);
            teacherLogo = { data: teacherData.logo, width: (dims.width / dims.height) * logoHeight, height: logoHeight };
        } catch(e) { console.error("Error processing teacher logo", e); }
    }

    const margin = { top: 35, right: 15, bottom: 20, left: 15 };
    let finalY = margin.top;

    const leaderAssignments = Object.entries(assignmentsForService)
        .filter(([, role]) => leaderRoleNames.has(role))
        .map(([nre, role]) => ({
            student: allStudents.find(s => s.nre === nre),
            role: role
        }))
        .filter(item => item.student);

    const tables: any[] = [];
    
    // 1. Líderes del Servicio Table
    if (leaderAssignments.length > 0) {
        const body = leaderRoles.map(role => {
            const assignment = leaderAssignments.find(a => a.role === role.name);
            const studentName = assignment ? `${assignment.student!.apellido1} ${assignment.student!.apellido2}, ${assignment.student!.nombre}`.toUpperCase() : '';
            return [role.name, studentName];
        });
        tables.push({
            head: [['Líderes del Servicio', '']],
            body,
            theme: 'striped',
            headStyles: { fillColor: '#e0f2f1', textColor: '#004d40', fontStyle: 'bold' },
            columnStyles: { 0: { fontStyle: 'bold' } },
        });
    }

    const generateGroupTables = (groupType: 'comedor' | 'takeaway') => {
        const assignedGroups = service.groupAssignments[groupType];
        if (assignedGroups.length > 0) {
             tables.push({
                body: [[{ content: `SERVICIO DE ${groupType.toUpperCase()}`, styles: { halign: 'center', fontStyle: 'bold', fontSize: 14, fillColor: groupType === 'comedor' ? '#e8f5e9' : '#e3f2fd' } }]],
                theme: 'plain'
             });

            assignedGroups.forEach(groupName => {
                const members = allStudents.filter(s => studentGroupAssignments[s.nre] === groupName);
                const memberAssignments = members.map(m => ({
                    name: `${m.apellido1} ${m.apellido2}, ${m.nombre}`.toUpperCase(),
                    role: assignmentsForService[m.nre] || 'Sin asignar'
                })).filter(m => !leaderRoleNames.has(m.role));

                if (memberAssignments.length > 0) {
                     tables.push({
                        head: [[{ content: groupName, colSpan: 2, styles: { fillColor: '#f5f5f5', textColor: '#424242' } }]],
                        body: memberAssignments.sort((a,b) => a.name.localeCompare(b.name)).map(item => [item.name, item.role]),
                        headStyles: { fontStyle: 'bold' },
                        columnStyles: { 1: { halign: 'right' } }
                    });
                }
            });
        }
    };
    
    generateGroupTables('comedor');
    generateGroupTables('takeaway');

    // Drawing logic
    const drawPage = (data: any) => {
        // Header
        if (instituteLogo) doc.addImage(instituteLogo.data, 'PNG', margin.left, 10, instituteLogo.width, instituteLogo.height);
        if (teacherLogo) doc.addImage(teacherLogo.data, 'PNG', doc.internal.pageSize.getWidth() - margin.right - teacherLogo.width, 10, teacherLogo.width, teacherLogo.height);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Planning: ${service.name}`, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Comienzo curso (${new Date(service.date).toLocaleDateString()})`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        const footerY = doc.internal.pageSize.getHeight() - 10;
        doc.text(`${instituteData.name} - ${teacherData.name}`, margin.left, footerY);
        doc.text(`Página ${data.pageNumber}`, doc.internal.pageSize.getWidth() / 2, footerY, { align: 'center' });
        doc.text(new Date().toLocaleDateString(), doc.internal.pageSize.getWidth() - margin.right, footerY, { align: 'right' });
    };

    let startY = margin.top;
    tables.forEach(table => {
        doc.autoTable({
            ...table,
            startY,
            margin,
            didDrawPage: drawPage
        });
        startY = doc.lastAutoTable.finalY + 6;
    });

    doc.save(`planning_${service.name.replace(/\s+/g, '_')}.pdf`);
};


/**
 * [LEGACY - Deprecated for new implementations] Generates a PDF from HTML.
 * @param title The title of the document.
 * @param contentHtml The HTML string of the content.
 * @param fileName The name of the file.
 * @param options Configuration options.
 */
export const downloadPdfFromHtml = (title: string, contentHtml: string, fileName: string, options: PdfOptions = {}) => {
    // ... (This function remains for any potential legacy use but new features should use downloadPdfWithTables)
    const { orientation = 'portrait' } = options;

    if (typeof jspdf === 'undefined') {
        alert("La librería para generar PDF (jsPDF) no está disponible. Por favor, recargue la página.");
        return;
    }
    
    const contentContainer = document.createElement('div');
    contentContainer.style.position = 'fixed';
    contentContainer.style.left = '-9999px';
    const contentWidthMm = (orientation === 'landscape' ? 297 : 210) - 20;
    contentContainer.style.width = `${contentWidthMm}mm`;
    contentContainer.style.backgroundColor = 'white';
    contentContainer.style.boxSizing = 'border-box';
    contentContainer.style.padding = '1px';
    
    const styles = `...`; // Unchanged
    
    contentContainer.innerHTML = `<style>${styles}</style><div id="pdf-content">${contentHtml}</div>`;
    document.body.appendChild(contentContainer);

    setTimeout(() => {
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
        // ... (rest of the function is unchanged)
    }, 100);
};


/**
 * Exports an array of data to an Excel file.
 * @param data The array of objects to export.
 * @param fileName The desired name for the output file (without extension).
 * @param sheetName The name for the sheet inside the Excel file.
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
    if (typeof XLSX === 'undefined') {
        alert("La librería de exportación a Excel no está disponible.");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};