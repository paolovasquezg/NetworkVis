const DEPARTMENTS = [
    "Departamento de Bioingeniería e Ingeniería Química", "Departamento de Ingeniería Mecánica y de la Energía",
    "Departamento de Ciencias", "Departamento de Ingeniería Electrónica y Mecatrónica",
    "Departamento de Ingeniería Civil y Ambiental", "Departamento de Ciencia de la Computación",
    "Departamento de Ingeniería Industrial y Gestión de la Ingeniería", "Departamento de Humanidades, Artes y Ciencias Sociales",
    "Departamento de Negocios Digitales", "Departamento de Ciencia de Datos y Sistemas de Información",
    "Departamento de Ciencia de Computación y de Datos", "Departamento de Sistemas y Seguridad de la Información",
    "Facultad de Negocios", "Unknown Department"];

const DEPARTMENT_COLORS = [
    "#00d4ff", "#ff6b35", "#00e5a0", "#f5d000",
    "#c77dff", "#ff4d6d", "#4cc9f0", "#f8961e",
    "#43aa8b", "#577590", "#f94144", "#90be6d",
    "#e63946", "#adb5bd", "#6c757d"];

const GRADIENT_CONFIGS = {
    degree: { title: "Color · Degree", min: "0", max: "18", from: "#f5c518", to: "#bd0026" },
    betweenness: { title: "Color · Betweenness", min: "0", max: "0.05", from: "#4cc9f0", to: "#03045e" },
    clustering: { title: "Clustering · Cohesion", min: "0", max: "1", from: "#80ffb0", to: "#005a32" },
};