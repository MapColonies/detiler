#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

# for username and password look here https://mapcolonies.atlassian.net/wiki/spaces/MAPConflicResolution/pages/1901068290/How+to+login+to+ACR+Registry+both+Helm+and+Docker+credentials?xpis=eyJicmlkZ2UiOiJxdWlja0ZpbmQiLCJpZCI6IjE3OTE3MjAzOTY5OTciLCJzb3VyY2UiOiJjb25mbHVlbmNlIn0%3D

usage() {
  echo "usage: $0 <acr-url> <short-sha> <vector-helms-dir>" >&2
  exit 1
}

[[ $# -eq 3 ]] || usage
ACR_URL="$1"
SHORT_SHA="$2"
VECTOR_HELMS_DIR="$3"

[[ -n "${ACR_URL}" ]] || usage
[[ -n "${SHORT_SHA}" ]] || usage
[[ -d "${VECTOR_HELMS_DIR}/.git" ]] || {
  echo "vector-helms repo not found at ${VECTOR_HELMS_DIR}" >&2
  exit 1
}
command -v docker >/dev/null || {
  echo "docker is required" >&2
  exit 1
}
command -v yq >/dev/null || {
  echo "yq is required (https://github.com/mikefarah/yq) to bump vector-helms" >&2
  exit 1
}

VALUES_FILE="${VECTOR_HELMS_DIR}/detiler-helms/values.yaml"

echo "Logging in to ${ACR_URL}..."
docker login "${ACR_URL}"

PACKAGES="${PACKAGES:-backend:detiler-backend frontend:detiler-frontend}"
for entry in ${PACKAGES}; do
  package="${entry%%:*}"
  image="${entry##*:}"
  tag="${ACR_URL}/${image}:${SHORT_SHA}"

  echo "==> Building ${tag} (packages/${package}/Dockerfile)"
  docker build -f "packages/${package}/Dockerfile" -t "${tag}" .

  if [[ "${SKIP_PUSH:-0}" != "1" ]]; then
    echo "==> Pushing ${tag}"
    docker push "${tag}"
  fi
done

echo "Done. SHORT_SHA=${SHORT_SHA}"


echo "==> Bumping image tags to ${SHORT_SHA} in ${VALUES_FILE}"
yq -i ".backend.image.tag = \"${SHORT_SHA}\"" "${VALUES_FILE}"
yq -i ".frontend.image.tag = \"${SHORT_SHA}\"" "${VALUES_FILE}"

if ! git -C "${VECTOR_HELMS_DIR}" diff --quiet -- detiler-helms/values.yaml; then
  git -C "${VECTOR_HELMS_DIR}" add detiler-helms/values.yaml
  git -C "${VECTOR_HELMS_DIR}" commit -m "chore(detiler): bump image tags to ${SHORT_SHA}"

  if [[ "${SKIP_HELM_PUSH:-0}" != "1" ]]; then
    echo "==> Pushing tag bump to vector-helms"
    git -C "${VECTOR_HELMS_DIR}" push
  else
    echo "SKIP_HELM_PUSH=1, committed locally in ${VECTOR_HELMS_DIR} but not pushed."
  fi
else
  echo "detiler-helms/values.yaml already at ${SHORT_SHA}, nothing to commit."
fi
