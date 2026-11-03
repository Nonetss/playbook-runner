# Ansible runner

## Infisical collection in native dev

The Docker images ship the `infisical.vault` collection. With `bun run dev:local` the service runs from your own environment, so install the same version once:

```bash
uv run ansible-galaxy collection install infisical.vault:1.2.3
```

It installs to `~/.ansible/collections`, on Ansible's default search path. `uv sync` already provides the `infisicalsdk` Python package.
