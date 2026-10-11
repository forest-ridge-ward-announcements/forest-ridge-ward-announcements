const fs = require('node:fs');
const path = require('node:path');
const { imageSize } = require('image-size');
const PptxGenJS = require('pptxgenjs');

const rootDirectory = path.join(__dirname, '..');
const dataPath = path.join(rootDirectory, 'announcements.json');
const outputPath = path.join(rootDirectory, 'downloads', 'announcements.pptx');
const navy = '0C2542';
const white = 'FFFFFF';
const accent = '8FB3DE';
const serifFont = 'Georgia';
const sansFont = 'Gill Sans MT';

function parseCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }

  return date;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function getUpcomingAnnouncements(announcements) {
  if (!Array.isArray(announcements)) {
    throw new Error('announcements.json must contain an announcements array.');
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return announcements.map((announcement, index) => {
    if (!announcement.title || !announcement.description) {
      throw new Error(`Announcement ${index + 1} must include a title and description.`);
    }

    const date = parseCalendarDate(announcement.date);
    if (!date) {
      throw new Error(`Announcement "${announcement.title}" must have a valid YYYY-MM-DD date.`);
    }

    return { announcement, date };
  })
    .filter(({ date }) => date >= startOfToday)
    .sort((first, second) => first.date - second.date);
}

function addSlideFrame(slide, pptx) {
  slide.background = { color: navy };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.35,
    y: 0.35,
    w: 12.63,
    h: 6.8,
    line: { color: accent, transparency: 30, width: 0.8 },
    fill: { color: navy, transparency: 100 }
  });
}

function addAnnouncementSlide(pptx, { announcement, date }) {
  const slide = pptx.addSlide();
  addSlideFrame(slide, pptx);

  slide.addText((announcement.category || 'ANNOUNCEMENT').toUpperCase(), {
    x: 0.95,
    y: 0.62,
    w: 11.4,
    h: 0.35,
    fontFace: sansFont,
    fontSize: 18,
    bold: true,
    charSpacing: 2,
    color: accent,
    margin: 0
  });

  const titleFontSize = Math.max(30, Math.min(42, 42 - Math.max(0, announcement.title.length - 24) * 0.35));
  slide.addText(announcement.title, {
    x: 0.95,
    y: 1.08,
    w: 11.4,
    h: 1.25,
    fontFace: serifFont,
    fontSize: titleFontSize,
    bold: true,
    color: white,
    breakLine: false,
    fit: 'shrink',
    margin: 0,
    valign: 'mid'
  });

  const imagePath = announcement.image
    ? path.resolve(rootDirectory, announcement.image)
    : null;
  const textWidth = imagePath ? 7.55 : 11.35;
  const metadata = [
    { label: 'DATE', value: formatDate(date) },
    { label: 'TIME', value: announcement.time },
    { label: 'LOCATION', value: announcement.location }
  ].filter(({ value }) => value);
  let rowY = 2.65;

  for (const item of metadata) {
    slide.addText(item.label, {
      x: 0.95,
      y: rowY + 0.04,
      w: 1.2,
      h: 0.32,
      fontFace: sansFont,
      fontSize: 13,
      bold: true,
      charSpacing: 1.2,
      color: accent,
      margin: 0
    });
    slide.addText(item.value, {
      x: 2.2,
      y: rowY,
      w: textWidth - 1.25,
      h: 0.45,
      fontFace: sansFont,
      fontSize: 22,
      bold: true,
      color: white,
      fit: 'shrink',
      margin: 0
    });
    rowY += 0.58;
  }

  const detailsY = rowY + 0.1;
  slide.addText('DETAILS', {
    x: 0.95,
    y: detailsY,
    w: 1.5,
    h: 0.3,
    fontFace: sansFont,
    fontSize: 13,
    bold: true,
    charSpacing: 1.2,
    color: accent,
    margin: 0
  });
  slide.addText(announcement.description, {
    x: 0.95,
    y: detailsY + 0.38,
    w: textWidth,
    h: 1.5,
    fontFace: sansFont,
    fontSize: 23,
    color: white,
    breakLine: false,
    fit: 'shrink',
    margin: 0,
    valign: 'top'
  });

  if (imagePath) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image for "${announcement.title}" was not found: ${announcement.image}`);
    }

    const dimensions = imageSize(fs.readFileSync(imagePath));
    const frame = { x: 9.05, y: 2.65, w: 3.25, h: 3.55 };
    const scale = Math.min(frame.w / dimensions.width, frame.h / dimensions.height);
    const imageWidth = dimensions.width * scale;
    const imageHeight = dimensions.height * scale;

    slide.addShape(pptx.ShapeType.rect, {
      ...frame,
      line: { color: accent, transparency: 35, width: 0.8 },
      fill: { color: navy, transparency: 100 }
    });
    slide.addImage({
      path: imagePath,
      x: frame.x + (frame.w - imageWidth) / 2,
      y: frame.y + (frame.h - imageHeight) / 2,
      w: imageWidth,
      h: imageHeight
    });
  }

  slide.addText('FOREST RIDGE WARD', {
    x: 0.95,
    y: 6.65,
    w: 11.4,
    h: 0.25,
    fontFace: sansFont,
    fontSize: 12,
    bold: true,
    charSpacing: 2,
    color: accent,
    margin: 0
  });
}

async function main() {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const announcements = getUpcomingAnnouncements(data.announcements);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Forest Ridge Ward';
  pptx.subject = 'Weekly ward announcements';
  pptx.title = 'Forest Ridge Ward Announcements';
  pptx.theme = {
    headFontFace: serifFont,
    bodyFontFace: sansFont,
    lang: 'en-US'
  };

  if (announcements.length === 0) {
    const slide = pptx.addSlide();
    addSlideFrame(slide, pptx);
    slide.addText('No Upcoming Announcements', {
      x: 0.95,
      y: 2.7,
      w: 11.4,
      h: 0.9,
      fontFace: serifFont,
      fontSize: 40,
      bold: true,
      color: white,
      align: 'center',
      margin: 0
    });
  } else {
    for (const announcement of announcements) {
      addAnnouncementSlide(pptx, announcement);
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await pptx.writeFile({ fileName: outputPath });
  console.log(`Generated ${announcements.length} upcoming announcement slide(s): ${outputPath}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});