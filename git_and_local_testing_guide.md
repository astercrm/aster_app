# ASTER Developer Guide: Local Testing & Git Workflow

This guide details how to run, test, and save (push) your modifications to GitHub. Since Git and Node.js are portable and local to this workspace, follow the steps below for a seamless setup.

---

## 1. Prepare Your Terminal (Do this first)

Every time you open a new PowerShell terminal in your project directory (`aster_app`), run this command to temporarily activate `git` and `npm` commands:

```powershell
$env:PATH = "$pwd\.node;$pwd\.git-bin\cmd;" + $env:PATH
```

**Verify activation by running:**
* `node -v` (should output `v20.15.0`)
* `git --version` (should output `git version 2.45.2.windows.1`)

---

## 2. Testing Your Changes Locally (Before pushing)

Always test your changes on your local machine to verify they work before publishing them to GitHub.

### Step-by-Step Local Testing:
1. **Start the development server**:
   In your terminal, run:
   ```powershell
   npm run dev
   ```
2. **Access the application**:
   Open your web browser and go to:
   [http://localhost:3000](http://localhost:3000)
3. **Inspect/Verify**:
   * Test the specific feature or component you modified.
   * Check the terminal output for any backend database warnings or logs.
   * Press `F12` in your browser to inspect the console for frontend JavaScript errors.
4. **Stop the server**:
   To stop the local server, press `Ctrl + C` in the terminal and type `Y` to confirm.

---

## 3. Git Version Control Workflow (Save and Publish)

Once you verify your edits are working locally, use this cycle to push them to GitHub.

### Step 1: Check what changed
See what files were modified compared to your last commit:
```powershell
git status
```

*(Optional)* View line-by-line changes:
```powershell
git diff
```

### Step 2: Stage your changes
Add the files you want to commit. To stage all modified files:
```powershell
git add .
```
*(Or target a specific file: `git add src/components/DropdownManager.tsx`)*

### Step 3: Commit your changes
Save the changes locally with a descriptive message explaining what you modified:
```powershell
git commit -m "Explain what you changed (e.g., Update DropdownManager design)"
```

### Step 4: Push to GitHub
Upload your local commits to your remote repository:
```powershell
git push origin master
```
*(If you are pushing for the first time or setting a new head, add the `--force` flag: `git push origin master --force`)*

---

## 4. Quick Cheat-Sheet

| Action | Command | Explanation |
| :--- | :--- | :--- |
| **Run App** | `npm run dev` | Starts local server at `http://localhost:3000` |
| **Status** | `git status` | Shows modified files |
| **Stage All** | `git add .` | Prepares all changed files to be saved |
| **Save Local**| `git commit -m "message"` | Saves snapshot of your edits |
| **Upload** | `git push origin master` | Publishes commits to GitHub |
| **Sync** | `git pull origin master` | Downloads latest changes from GitHub |
