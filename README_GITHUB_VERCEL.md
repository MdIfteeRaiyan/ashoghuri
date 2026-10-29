# AshoGhuri — GitHub and Vercel setup

This is a static site package. All pages, scripts, styles, and media are in `dist/`. The expense-panel simplification and search-hint removal from the latest local changes are included. No Git history or credentials are included.

## Push to a new GitHub repository

1. Extract this ZIP.
2. Create an empty repository on GitHub. Do not add a README or license there.
3. Open a terminal in the extracted folder (the folder containing `dist/` and this file), then run:

```bash
git init
git add dist README_GITHUB_VERCEL.md
git commit -m "Add AshoGhuri travel site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the GitHub URL with the repository you created. GitHub may prompt you to authenticate with its browser flow or a personal access token; never put a token in this README or share it.

## Deploy with Vercel

1. In Vercel, choose **Add New → Project** and import the GitHub repository.
2. Set **Framework Preset** to **Other** and **Root Directory** to `.`.
3. Leave **Build Command** and **Install Command** blank.
4. Set **Output Directory** to `dist`.
5. Select **Deploy**. Later, push commits to `main` to trigger new deployments.

The included site is static and does not need package installation or a build step. Price estimates and quote-needed states remain labeled in the site; this ZIP does not make unverified fares into confirmed prices.
