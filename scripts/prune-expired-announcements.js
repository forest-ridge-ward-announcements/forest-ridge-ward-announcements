const fs = require('node:fs');
const path = require('node:path');

const dataPath = path.join(__dirname, '..', 'announcements.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

if (!Array.isArray(data.announcements)) {
  throw new Error('announcements.json must contain an announcements array.');
}

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const upcoming = data.announcements.filter((announcement, index) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(announcement.date || '');
  if (!match) {
    throw new Error(`Announcement ${index + 1} must have a valid YYYY-MM-DD date.`);
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    throw new Error(`Announcement ${index + 1} must have a valid YYYY-MM-DD date.`);
  }

  return date >= today;
});

const removedCount = data.announcements.length - upcoming.length;
if (process.argv.includes('--dry-run')) {
  console.log(`Would remove ${removedCount} expired announcement(s); ${upcoming.length} would remain.`);
} else if (removedCount > 0) {
  data.announcements = upcoming;
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Removed ${removedCount} expired announcement(s); ${upcoming.length} remain.`);
} else {
  console.log(`No expired announcements; ${upcoming.length} remain.`);
}