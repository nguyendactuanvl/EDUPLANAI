const { execSync } = require('child_process');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.log(e.message);
}
