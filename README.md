My Real-Life Leveling System

This is a personal XP and leveling system inspired by Solo Leveling, designed to gamify your real-life grind. Track your XP, gain levels, allocate character stats, and complete daily quests!

## Hosting on GitHub Pages (Without Local Build)

Follow these steps to get your app deployed directly from GitHub:

### 1. Create a New GitHub Repository

1.  Go to [github.com/new](https://github.com/new).
2.  Give your repository a name (e.g., `my-leveling-system`). **This name should exactly match `YOUR_REPO_NAME` in the `package.json` and `homepage` URL.**
3.  Choose "Public" or "Private."
4.  **Important:** Do NOT initialize the repository with a README, .gitignore, or license. You'll add these manually.
5.  Click "Create repository."

### 2. Upload the Project Files

Now you will manually add all the provided files to your new GitHub repository:

1.  On your new repository page on GitHub, click on the "uploading an existing file" link, or drag and drop files into the main area.
2.  **Upload the following files/folders directly:**
    * **`public/` folder:** Upload the `index.html` inside it.
    * **`src/` folder:** Upload the `App.js` inside it.
    * **`.github/` folder:** Create this folder, then create a `workflows/` folder inside it, and upload the `deploy.yml` file into `workflows/`.
    * **`.gitignore` file:** Upload this file directly to the root.
    * **`package.json` file:** Upload this file directly to the root.

3.  **Commit changes:** Add a commit message like "Initial project setup" and click "Commit changes."

### 3. Configure Your Firebase Project

Your app uses Firebase Firestore for data saving. You need to set up your own Firebase project and provide its configuration to `src/App.js`.

1.  **Go to the Firebase Console:** [console.firebase.google.com](https://console.firebase.google.com/)
2.  **Add project:** Click "Add project" and follow the steps to create a new project.
3.  **Enable Firestore:**
    * Navigate to "Firestore Database" in the left menu.
    * Click "Create database."
    * Choose "Start in production mode."
    * Select a Cloud Firestore location (e.g., `us-central`).
4.  **Get Your Firebase Configuration:**
    * Go back to "Project overview."
    * Click the "Web" icon (`</>`) to "Add Firebase to your web app."
    * Register your app (e.g., "My Leveling App").
    * **Copy the `firebaseConfig` object.**
5.  **Update `src/App.js` on GitHub:**
    * On GitHub, navigate to your `my-leveling-system` repository.
    * Click on `src/App.js`.
    * Click the "Edit" (pencil) icon.
    * Find the `firebaseConfig` object placeholder (around line 10):
        ```javascript
        const firebaseConfig = {
          apiKey: "YOUR_FIREBASE_API_KEY",
          authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
          projectId: "YOUR_FIREBASE_PROJECT_ID",
          // ... rest of config
        };
        ```
    * **Replace all the `YOUR_FIREBASE_...` placeholders** with your actual values copied from the Firebase Console.
    * **Commit changes** at the bottom of the page. This commit will automatically trigger the GitHub Actions workflow.

### 4. Set Up Firestore Security Rules

**This is critical for your data's security.**

1.  In the Firebase Console, go to "Firestore Database" -> "Rules."
2.  Replace the default rules with the following:
    ```firestore
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Public data: accessible by any authenticated user
        match /artifacts/{appId}/public/data/{document=**} {
          allow read, write: if request.auth != null;
        }

        // Private user data: accessible only by the authenticated user who owns it
        match /artifacts/{appId}/users/{userId}/{document=**} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
    ```
3.  Click "Publish."

### 5. Enable GitHub Pages

Once your `src/App.js` is updated and committed on GitHub, the GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically trigger. It will build your React app and push the compiled code to a new branch (usually `gh-pages`). You then need to tell GitHub Pages to serve from this branch.

1.  Go to your repository on GitHub.
2.  Click on "Settings."
3.  In the left sidebar, click "Pages."
4.  Under "Branch," select `gh-pages` (or `main`/`master` if your `deploy.yml` is configured to publish to that branch for user/org pages) and `/ (root)` for the folder.
5.  Click "Save."

After a few moments, GitHub Pages will deploy your site. You'll see a link like `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME` on the Pages settings page once it's live. It might take a minute or two for the page to become accessible.

You now have your Real-Life Leveling System hosted and running, with data persistence powered by Firebase, all without a local development environment!
