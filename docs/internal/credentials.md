# Credentials (machine-local, intentionally not in git)

- **GITHUB_APP_ID:** `3847496`, in the encrypted registry (`~/.dotfiles/secrets/values.age`) and
  `~/.local/secrets` as `GITHUB_APP_ID`.
- **GITHUB_APP_INSTALLATION_ID:** `135372268`, a single installation on glw907 covering ecxc-ski
  and 907-life. In `values.age` and `~/.local/secrets`.
- **Private key:** `GITHUB_APP_PRIVATE_KEY_B64` (base64 of the PEM, single-line) in `values.age`
  and `~/.local/secrets`. A consumer site pushes it to its Worker via `sync.sh` (`atob()`
  in-Worker before `@octokit/auth-app`).
- **D1 AUTH_DB (self-owned magic-link auth store):** ecxc = `cairn-ecxc-auth`
  `a47c56d2-25ef-4131-a505-8c9fd5a92f1f`; 907 = `cairn-907-auth`
  `93aa929d-0228-4f8b-8d1e-5e7e0d755617`. Bound as `AUTH_DB` per site.
