# Monthful

A colorful, student-friendly calendar for planning an entire month without the clutter of a corporate calendar.

## Features

- Hour, day, week, and month views
- Fast event creation by clicking any date or time
- Optional reminders and browser notifications
- Weekly recurring events
- Built-in and custom color categories
- Quick-add buttons for common student activities
- Live month statistics and upcoming-event summary
- Responsive desktop and mobile layout
- Browser storage—events remain after refreshing

## Run locally

No installation or build step is required. Open `index.html` in a browser.

For the most reliable browser-notification behavior, serve the folder locally. For example:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish with GitHub Desktop

1. Open GitHub Desktop.
2. Select **File → Add Local Repository**.
3. Choose this `monthful` folder.
4. Click **Publish repository**.

To make the website public with GitHub Pages, open the repository on GitHub and go to **Settings → Pages**. Choose **Deploy from a branch**, select `main` and `/ (root)`, then save.

## Technology

Monthful uses only HTML, CSS, and JavaScript. It has no framework or package dependencies.
