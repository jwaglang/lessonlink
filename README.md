# LessonLink Project

This is your LessonLink application, a Next.js-based tutoring companion built in Firebase Studio.

## How to Back Up Your Project

The best way to save and manage your project files is by using Git and GitHub. This will allow you to keep a version history of your code and have a secure backup.

Follow these steps to connect this project to a GitHub repository:

### Step 1: Set up your local repository

First, you need to initialize a Git repository in your project directory. Open the terminal and run the following commands:

```bash
# Initialize a new Git repository
git init -b main

# Stage all your current files for the first commit
git add .

# Commit your files
git commit -m "Initial commit"
```

### Step 2: Create a new repository on GitHub

1.  Go to [GitHub](https://github.com) and log in to your account.
2.  Click the **+** icon in the top-right corner and select **"New repository"**.
3.  Give your repository a name (e.g., `lessonlink-app`).
4.  You can add a description, but leave the "Initialize this repository with:" options unchecked, as you already have a project to push.
5.  Click **"Create repository"**.

### Step 3: Connect your project to GitHub

After creating the repository, GitHub will show you a URL for it. Copy that URL.

Back in your terminal, run the following commands, replacing `<YOUR_GITHUB_REPO_URL>` with the URL you just copied:

```bash
# Add the remote repository
git remote add origin <YOUR_GITHUB_REPO_URL>

# Verify the new remote
git remote -v
```

### Step 4: Push your code to GitHub

Finally, push your initial commit to the GitHub repository:

```bash
git push -u origin main
```

That's it! All your project files are now safely backed up on GitHub. From now on, whenever you make changes you want to save, you can run `git add .`, `git commit -m "Your message"`, and `git push`.
