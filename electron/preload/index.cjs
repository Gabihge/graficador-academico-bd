const { contextBridge } = require("electron");

// Superficie IPC explicita y minima (seccion 13 de la especificacion:
// contextIsolation true, nodeIntegration false, sin acceso directo a Node
// desde el renderer). Se ira completando en el Incremento 9
// (Offline/Desktop/Exports) con los dialogos de archivo reales.
contextBridge.exposeInMainWorld("bdproj", {
  // placeholder: sin API expuesta todavia
});
