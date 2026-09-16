try {
  decodeURIComponent('%E2%82'); // Incomplete utf-8 percent encoding
  console.log("Success");
} catch(e) {
  console.log("ERROR:", e.message);
}
