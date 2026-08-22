/**
 * Whether `candidate` (the PR number read back from a render artifact,
 * itself only ever written from the trusted `${{ github.event.
 * pull_request.number }}` expression in `pr-check.yml`) is among the PR
 * numbers GitHub's own API actually associates with the triggering
 * workflow run's commit. This is the cross-check that closes the trust
 * chain: an artifact is PR-controlled content, so its declared PR number
 * must be independently confirmed before it's used to push files or post a
 * comment — see .vibe/decisions/018-pr-preview-trusts-only-workflow-expressions.md.
 */
export function isPrNumberAssociated(
  candidate: number,
  associatedPrNumbers: number[],
): boolean {
  if (!Number.isInteger(candidate) || candidate <= 0) {
    return false;
  }

  return associatedPrNumbers.includes(candidate);
}
