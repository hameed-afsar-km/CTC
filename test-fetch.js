fetch("http://localhost:3000/api/gallery")
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
