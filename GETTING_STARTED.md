# Getting Started — for total beginners

This guide gets the Family Calendar running on **your own computer** so
you can click around and try it. No coding, no databases, no accounts
needed.

> **Important — what "running on your computer" means:** the calendar
> isn't a normal website. It's a small program that has to be running
> on your laptop in the background. While the program is running, you
> open `http://localhost:5173` in your browser to use it. When you
> close the program, the address stops working — that's normal. We
> deal with putting it on a real website later.

---

## Step 1 — Install Node.js (one time, ~3 minutes)

Node.js is the tool that runs the calendar. You only do this once,
ever.

1. Go to **https://nodejs.org**
2. Click the big green **"LTS"** button to download the installer.
3. Open the file you just downloaded and click **Next → Next → Install.**
   The default options are fine.
4. When it finishes, close the installer.

You don't need to use Node.js yourself — you just needed to install it
so the next step works.

---

## Step 2 — Get this code onto your computer

If you're reading this on GitHub:

1. Click the green **`<> Code`** button at the top of the repo.
2. Click **"Download ZIP"**.
3. Unzip the file you just downloaded. You'll get a folder named
   something like `Retailer-analyzer-claude-family-calendar-app-LDRCq`.

Put that folder somewhere easy to find, like your Desktop.

---

## Step 3 — Start the app

### On Mac

1. Open the folder you just unzipped.
2. Double-click **`start.sh`**.
   - If your Mac says *"can't be opened because Apple cannot check it
     for malicious software"*: right-click the file → **Open** → click
     **Open** in the dialog. You only need to do this once.
   - If that doesn't work, open the **Terminal** app, type `bash `
     (with the space), then drag `start.sh` from Finder into the
     Terminal window, then press Enter.

### On Windows

1. Open the folder you just unzipped.
2. Double-click **`start.bat`**.
   - If Windows shows a blue *"Windows protected your PC"* warning,
     click **More info** → **Run anyway**.

### What you'll see

The first time, it'll spend about a minute installing things and
print a bunch of progress text. That's normal. After that, it'll:

- Open a window (or two) with text scrolling — leave them open.
- Open your web browser to the calendar.

If the browser doesn't open by itself, manually go to
**http://localhost:5173**.

---

## Step 4 — Log in

You'll see a login screen. Use one of these:

| Username | Password |
| -------- | -------- |
| `alex`   | `demo`   |
| `sam`    | `demo`   |

Now you can:

- Click **Calendar** to see the month view, click any day to add an event.
- Click an event to see details and add comments.
- Click **+ Add event** on the dashboard for a quick add.

---

## Step 5 — Stopping the app

- **Mac:** click the Terminal/launcher window and press `Ctrl-C`, or
  just close the window.
- **Windows:** close the two black "Backend" and "Frontend" windows.

---

## Common gotchas

**"Can't connect to localhost:5173"**
The app isn't running. Run `start.sh` (Mac) or `start.bat` (Windows)
again. The address only works while the launcher windows are open.

**"Address already in use" or "port 4000 / 5173 in use"**
You already have an old copy running, or another app is using those
ports. Restart your computer to clear them, or close any other
launcher windows you have open.

**Events disappear when I restart**
That's expected in demo mode — data lives in memory only. To make it
permanent, see `FAMILY_CALENDAR.md` for the full Firebase + Vercel
setup. Ask Claude when you're ready.

**"node is not recognized" (Windows) or "command not found: node" (Mac)**
Node.js didn't install correctly, or the installer didn't update your
PATH yet. Restart your computer and try again.

---

## What's next?

Once you've played with the demo and decided you like it, the next
step is to "deploy" it — put it on a real address (like
`yourname-calendar.vercel.app`) so it works from your phone, with data
that doesn't disappear. That's a bigger setup (Firebase account,
Vercel account, ~30 minutes the first time). When you're ready, just
ask Claude to walk you through it.
