const announcementsContainer = document.querySelector('.announcements');

function parseCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

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

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function createAnnouncementCard(announcement, date) {
  const card = document.createElement(announcement.url ? 'a' : 'article');
  card.className = announcement.url ? 'announcement announcement-link' : 'announcement';

  if (announcement.url) {
    card.href = announcement.url;
  }

  const dateElement = document.createElement('div');
  dateElement.className = 'announcement-date';
  dateElement.innerHTML = `<strong>${date.getDate()}</strong>${date.toLocaleString('en-US', { month: 'short' })}`;

  const content = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = announcement.title;
  const description = document.createElement('p');
  description.textContent = announcement.description;
  content.append(title, description);

  card.append(dateElement, content);

  if (announcement.url) {
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '\u2192';
    card.append(arrow);
  }

  return card;
}

async function loadAnnouncements() {
  try {
    const response = await fetch('announcements.json');

    if (!response.ok) {
      throw new Error(`Unable to load announcements: ${response.status}`);
    }

    const announcements = await response.json();
    const upcomingAnnouncements = announcements
      .map(announcement => ({ announcement, date: parseCalendarDate(announcement.date) }))
      .filter(({ date }) => date && date >= startOfToday())
      .sort((first, second) => first.date - second.date);

    announcementsContainer.replaceChildren(
      ...upcomingAnnouncements.map(({ announcement, date }) => createAnnouncementCard(announcement, date))
    );
  } catch (error) {
    announcementsContainer.textContent = 'Announcements are temporarily unavailable.';
    console.error(error);
  }
}

loadAnnouncements();
