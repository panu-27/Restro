const { execSync } = require('child_process');
const lines = execSync('wmic process where name="node.exe" get processid,commandline').toString().split('\n');
for (const line of lines) {
  if (line.includes('index.js')) {
    const pidMatch = line.match(/(\d+)\s*$/);
    if (pidMatch) {
      const pid = parseInt(pidMatch[1]);
      try {
        process.kill(pid);
        console.log('Killed old node index.js process:', pid);
      } catch(e) {
        console.log('Failed to kill:', pid, e.message);
      }
    }
  }
}
