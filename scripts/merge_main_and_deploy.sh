#!/usr/bin/env bash
set -euo pipefail

MAIN_REF="${MAIN_REF:-main}"
DEPLOY_COMMAND="${DEPLOY_COMMAND:-}"

if git show-ref --verify --quiet "refs/heads/${MAIN_REF}"; then
  SOURCE_REF="${MAIN_REF}"
elif git show-ref --verify --quiet "refs/remotes/origin/${MAIN_REF}"; then
  SOURCE_REF="origin/${MAIN_REF}"
else
  echo "Error: could not find '${MAIN_REF}' locally or at origin/${MAIN_REF}." >&2
  echo "Tip: add a remote and run 'git fetch origin ${MAIN_REF}' before deploying." >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
echo "Merging ${SOURCE_REF} into ${CURRENT_BRANCH}..."
git merge --no-edit "${SOURCE_REF}"

echo "Running tests before deployment..."
pytest -q

if [[ -z "${DEPLOY_COMMAND}" ]]; then
  echo "No DEPLOY_COMMAND provided. Skipping deployment step."
  echo "Set DEPLOY_COMMAND to your platform command, e.g. 'flyctl deploy' or 'render deploy'."
  exit 0
fi

echo "Running deployment command: ${DEPLOY_COMMAND}"
bash -lc "${DEPLOY_COMMAND}"
